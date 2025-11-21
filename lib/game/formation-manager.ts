// lib/game/formation-manager.ts
export interface FormationPosition {
  x: number;
  y: number;
  index: number;
}

export class FormationManager {
  static readonly MAX_GROUP_SIZE = 49;
  static readonly FORMATION_SPACING = 3;

  static createDiamondFormation(centerX: number, centerY: number, troopCount: number): FormationPosition[] {
    const positions: FormationPosition[] = [];
    
    if (troopCount === 0) return positions;
    
    // Calculate diamond dimensions for 49 troops (7x7 diamond)
    const rings = 3; // For 49 troops: 1 + 3 + 5 + 7 + 5 + 3 + 1 = 25? Wait, let me recalculate...
    
    // Actually for 49 troops in diamond: 1 + 3 + 5 + 7 + 9 + 11 + 13 = 49
    let placed = 0;
    let ring = 0;
    
    while (placed < troopCount) {
      const ringSize = ring * 2 + 1;
      const startX = -ring;
      const startY = -ring;
      
      // Top and bottom of current ring
      for (let i = 0; i < ringSize && placed < troopCount; i++) {
        // Top row of ring
        positions.push({
          x: centerX + (startX + i) * this.FORMATION_SPACING,
          y: centerY + startY * this.FORMATION_SPACING,
          index: placed
        });
        placed++;
        
        // Bottom row of ring (skip for center ring to avoid duplicates)
        if (ring > 0 && placed < troopCount) {
          positions.push({
            x: centerX + (startX + i) * this.FORMATION_SPACING,
            y: centerY + (-startY) * this.FORMATION_SPACING,
            index: placed
          });
          placed++;
        }
      }
      
      // Left and right sides of ring (excluding corners)
      if (ring > 0) {
        for (let i = 1; i < ringSize - 1 && placed < troopCount; i++) {
          // Left side
          positions.push({
            x: centerX + startX * this.FORMATION_SPACING,
            y: centerY + (startY + i) * this.FORMATION_SPACING,
            index: placed
          });
          placed++;
          
          // Right side
          if (placed < troopCount) {
            positions.push({
              x: centerX + (-startX) * this.FORMATION_SPACING,
              y: centerY + (startY + i) * this.FORMATION_SPACING,
              index: placed
            });
            placed++;
          }
        }
      }
      
      ring++;
    }
    
    return positions.slice(0, troopCount);
  }

  static findNearestIncompleteGroup(
    troops: Troop[], 
    newTroopType: string, 
    currentX: number, 
    currentY: number,
    maxDistance: number = 20
  ): { groupId: string, center: { x: number; y: number }, count: number } | null {
    
    // Group troops by groupId
    const groups = new Map<string, Troop[]>();
    
    troops.forEach(troop => {
      if (troop.groupId && troop.type === newTroopType) {
        if (!groups.has(troop.groupId)) {
          groups.set(troop.groupId, []);
        }
        groups.get(troop.groupId)!.push(troop);
      }
    });
    
    let bestGroup: { groupId: string, center: { x: number; y: number }, count: number, distance: number } | null = null;
    
    // Find the nearest incomplete group
    groups.forEach((groupTroops, groupId) => {
      if (groupTroops.length >= this.MAX_GROUP_SIZE) return; // Skip full groups
      
      // Calculate group center
      const centerX = groupTroops.reduce((sum, troop) => sum + troop.x, 0) / groupTroops.length;
      const centerY = groupTroops.reduce((sum, troop) => sum + troop.y, 0) / groupTroops.length;
      
      // Calculate distance to new troop
      const distance = Math.sqrt(Math.pow(centerX - currentX, 2) + Math.pow(centerY - currentY, 2));
      
      if (distance <= maxDistance) {
        if (!bestGroup || distance < bestGroup.distance) {
          bestGroup = {
            groupId,
            center: { x: centerX, y: centerY },
            count: groupTroops.length,
            distance
          };
        }
      }
    });
    
    return bestGroup;
  }

  static calculateOptimalPosition(
    groupTroops: Troop[], 
    newTroopType: string
  ): { x: number; y: number } {
    
    if (groupTroops.length === 0) {
      // Shouldn't happen, but fallback
      return { x: 0, y: 0 };
    }
    
    const centerX = groupTroops.reduce((sum, troop) => sum + troop.x, 0) / groupTroops.length;
    const centerY = groupTroops.reduce((sum, troop) => sum + troop.y, 0) / groupTroops.length;
    
    // Get formation positions for the full group size
    const formation = this.createDiamondFormation(centerX, centerY, this.MAX_GROUP_SIZE);
    
    // Find the first position that isn't occupied
    for (const pos of formation) {
      const isOccupied = groupTroops.some(troop => 
        Math.abs(troop.x - pos.x) < 1 && Math.abs(troop.y - pos.y) < 1
      );
      
      if (!isOccupied) {
        return { x: pos.x, y: pos.y };
      }
    }
    
    // Fallback: position around the edge
    return {
      x: centerX + (Math.random() * 10 - 5),
      y: centerY + (Math.random() * 10 - 5)
    };
  }
}
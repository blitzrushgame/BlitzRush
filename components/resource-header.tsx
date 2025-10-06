export default function ResourceHeader() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-neutral-700/50">
      <div className="flex justify-center items-center py-3 px-6">
        <div className="flex space-x-8">
          {/* Concrete */}
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-amber-200 rounded-sm border border-amber-300"></div>
            <span className="text-amber-200 font-semibold text-sm">CONCRETE</span>
            <span className="text-white font-mono text-sm">1,250</span>
          </div>

          {/* Steel */}
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-sm border border-red-400"></div>
            <span className="text-red-400 font-semibold text-sm">STEEL</span>
            <span className="text-white font-mono text-sm">850</span>
          </div>

          {/* Carbon */}
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded-sm border border-green-400"></div>
            <span className="text-green-400 font-semibold text-sm">CARBON</span>
            <span className="text-white font-mono text-sm">420</span>
          </div>

          {/* Fuel */}
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-purple-500 rounded-sm border border-purple-400"></div>
            <span className="text-purple-400 font-semibold text-sm">FUEL</span>
            <span className="text-white font-mono text-sm">675</span>
          </div>
        </div>
      </div>
    </div>
  )
}

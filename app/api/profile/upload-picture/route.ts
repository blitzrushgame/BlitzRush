import { put, del } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const userId = formData.get("userId") as string
    const oldPictureUrl = formData.get("oldPictureUrl") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 })
    }

    // Delete old profile picture if it exists and is a blob URL
    if (oldPictureUrl && oldPictureUrl.includes("blob.vercel-storage.com")) {
      try {
        await del(oldPictureUrl)
      } catch (error) {
        console.error("Error deleting old picture:", error)
        // Continue even if deletion fails
      }
    }

    // Upload to Vercel Blob with a unique filename
    const filename = `profile-pictures/${userId}-${Date.now()}-${file.name}`
    const blob = await put(filename, file, {
      access: "public",
    })

    // Update user profile in database
    const supabase = createServiceRoleClient()
    const { error: updateError } = await supabase
      .from("users")
      .update({ profile_picture: blob.url })
      .eq("id", Number.parseInt(userId))

    if (updateError) {
      // If database update fails, delete the uploaded blob
      await del(blob.url)
      throw updateError
    }

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

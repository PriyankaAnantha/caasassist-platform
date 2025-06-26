import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()

    // Get user session
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      return NextResponse.json({ error: `Cannot access storage: ${listError.message}` }, { status: 500 })
    }

    const documentsBucket = buckets?.find((bucket) => bucket.name === "documents")

    if (!documentsBucket) {
      return NextResponse.json(
        {
          error: "Documents bucket not found. Please create it manually in Supabase Storage dashboard.",
        },
        { status: 404 },
      )
    }

    // Test bucket access
    const { data: files, error: filesError } = await supabase.storage.from("documents").list("", { limit: 1 })

    if (filesError) {
      return NextResponse.json(
        {
          error: `Bucket exists but cannot access files: ${filesError.message}. Check RLS policies.`,
        },
        { status: 403 },
      )
    }

    // Test upload
    const testFile = new File(["test"], "test.txt", { type: "text/plain" })
    const testPath = `${session.user.id}/test-${Date.now()}.txt`

    const { error: uploadError } = await supabase.storage.from("documents").upload(testPath, testFile)

    if (uploadError) {
      return NextResponse.json(
        {
          error: `Cannot upload to bucket: ${uploadError.message}`,
        },
        { status: 403 },
      )
    }

    // Clean up test file
    await supabase.storage.from("documents").remove([testPath])

    return NextResponse.json({
      success: true,
      message: "Storage is working correctly",
    })
  } catch (error: any) {
    console.error("Storage setup error:", error)
    return NextResponse.json(
      {
        error: `Storage setup failed: ${error.message}`,
      },
      { status: 500 },
    )
  }
}

import { NextRequest, NextResponse } from "next/server";
import { contentService } from "@/lib/content-service";
import { adminService } from "@/lib/admin-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (!slug || slug === "all") {
      const allPages = await contentService.getAllPages();
      return NextResponse.json({ success: true, pages: allPages });
    }

    const page = await contentService.getPageContent(slug);
    return NextResponse.json({ success: true, page });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load page content" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, token, slug, content } = body;

    if (!token) {
      return NextResponse.json({ error: "Admin authentication token required" }, { status: 401 });
    }

    const isAuthorized = await adminService.verifyAdminAccessAsync(String(token));
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    if (action === "reset_page" || action === "reset_default") {
      if (!slug) return NextResponse.json({ error: "Page slug required" }, { status: 400 });
      const resetPage = await contentService.resetPageContent(String(token), String(slug));
      return NextResponse.json({
        success: true,
        message: `Reset '${resetPage.title}' to canonical defaults.`,
        page: resetPage,
      });
    }

    if (action === "save_page" || action === "update_page") {
      if (!slug || !content) {
        return NextResponse.json({ error: "Slug and content payload required" }, { status: 400 });
      }
      const updatedPage = await contentService.savePageContent(String(token), String(slug), content);
      return NextResponse.json({
        success: true,
        message: `Successfully published changes to '${updatedPage.title}'.`,
        page: updatedPage,
      });
    }

    return NextResponse.json({ error: "Invalid content action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update page content" },
      { status: 500 }
    );
  }
}

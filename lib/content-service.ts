import { dbRepository } from "./db-client";
import { adminService } from "./admin-service";
import { CANONICAL_PAGES_DATA, type PolicySection, type LegalPageContent } from "./content-data";

export type { PolicySection, LegalPageContent };
export { CANONICAL_PAGES_DATA };

export const contentService = {
  getCanonicalPage(slug: string): LegalPageContent {
    const cleanSlug = slug.toLowerCase().replace(/^\/+/, "").trim();
    for (const key of Object.keys(CANONICAL_PAGES_DATA)) {
      const page = CANONICAL_PAGES_DATA[key];
      if (page.slug === cleanSlug || page.aliasSlugs.includes(cleanSlug)) {
        return page;
      }
    }
    // Fallback to rules if unknown
    return CANONICAL_PAGES_DATA["compulsory-jump-rules"];
  },

  async getPageContent(slug: string): Promise<LegalPageContent> {
    const canonical = this.getCanonicalPage(slug);
    try {
      // Look up custom overridden content from system settings
      const settings = await dbRepository.getSystemSettings("general");
      const settingKey = `page_content_${canonical.slug}`;
      const entry = settings.find((s) => s.key === settingKey);
      if (entry && entry.value) {
        const custom = typeof entry.value === "string" ? JSON.parse(entry.value) : entry.value;
        return {
          ...canonical,
          ...custom,
          slug: canonical.slug,
          aliasSlugs: canonical.aliasSlugs,
        };
      }
    } catch {
      // Return canonical fallback
    }
    return canonical;
  },

  async getAllPages(): Promise<LegalPageContent[]> {
    const slugs = ["compulsory-jump-rules", "fair-play-guarantee", "terms-of-service"];
    const results: LegalPageContent[] = [];
    for (const slug of slugs) {
      results.push(await this.getPageContent(slug));
    }
    return results;
  },

  async savePageContent(
    adminToken: string,
    slug: string,
    content: Partial<LegalPageContent>
  ): Promise<LegalPageContent> {
    const isAuthorized = await adminService.verifyAdminAccessAsync(adminToken);
    if (!isAuthorized) {
      throw new Error("Unauthorized: Admin privileges required to update legal and policy pages.");
    }

    const canonical = this.getCanonicalPage(slug);
    const existing = await this.getPageContent(canonical.slug);

    const updated: LegalPageContent = {
      ...existing,
      ...content,
      slug: canonical.slug,
      aliasSlugs: canonical.aliasSlugs,
      lastUpdated: content.lastUpdated || new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };

    const settingKey = `page_content_${canonical.slug}`;
    await dbRepository.saveSystemSetting("general", settingKey, updated, adminToken);

    await adminService.logAdminAction(
      adminToken,
      "Administrator",
      "UPDATE_LEGAL_PAGE",
      canonical.title,
      {
        slug: canonical.slug,
        title: updated.title,
        version: updated.version,
        sectionsCount: updated.sections?.length || 0,
        timestamp: new Date().toISOString(),
      }
    );

    return updated;
  },

  async resetPageContent(adminToken: string, slug: string): Promise<LegalPageContent> {
    const isAuthorized = await adminService.verifyAdminAccessAsync(adminToken);
    if (!isAuthorized) {
      throw new Error("Unauthorized: Admin privileges required to reset legal pages.");
    }

    const canonical = this.getCanonicalPage(slug);
    const settingKey = `page_content_${canonical.slug}`;
    await dbRepository.saveSystemSetting("general", settingKey, canonical, adminToken);

    await adminService.logAdminAction(
      adminToken,
      "Administrator",
      "RESET_LEGAL_PAGE_DEFAULTS",
      canonical.title,
      { slug: canonical.slug, timestamp: new Date().toISOString() }
    );

    return canonical;
  }
};

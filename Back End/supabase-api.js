/** Supabase data API — maps DB rows to existing frontend shapes */
const MatiSupabaseApi = (() => {
  function client() {
    return MatiSupabase?.getClient?.() || null;
  }

  function siteFromRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      categoryLabel: row.category_label || row.categoryLabel,
      heritageCategory: row.heritage_category || row.heritageCategory || "",
      ownership: row.ownership || "",
      location: row.location || "",
      description: row.description || "",
      lat: row.lat,
      lng: row.lng,
      cover: row.cover || "",
      modelSrc: row.model_src || row.modelSrc || "",
      updatedAt: row.updated_at || row.updatedAt,
    };
  }

  function siteToRow(site) {
    return {
      id: site.id,
      name: site.name,
      category: site.category,
      category_label: site.categoryLabel,
      heritage_category: site.heritageCategory || "",
      ownership: site.ownership || "",
      location: site.location || "",
      description: site.description || "",
      lat: site.lat ?? null,
      lng: site.lng ?? null,
      cover: site.cover || "",
      model_src: site.modelSrc || "",
      is_deleted: false,
    };
  }

  function mediaFromRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      siteId: row.site_id,
      type: row.type,
      title: row.title,
      src: row.src,
      caption: row.caption || "",
      credit: row.credit || "",
      year: row.year || "",
    };
  }

  function mediaToRow(item) {
    return {
      id: item.id,
      site_id: item.siteId,
      type: item.type,
      title: item.title,
      src: item.src,
      caption: item.caption || "",
      credit: item.credit || "",
      year: item.year || "",
      is_deleted: false,
    };
  }

  async function listSites(category) {
    const sb = client();
    if (!sb) return null;

    let query = sb
      .from("heritage_sites")
      .select("*")
      .eq("is_deleted", false)
      .order("name", { ascending: true });

    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(siteFromRow);
  }

  async function upsertSite(site) {
    const sb = client();
    if (!sb) return null;

    const { data, error } = await sb
      .from("heritage_sites")
      .upsert(siteToRow(site), { onConflict: "id" })
      .select("*")
      .single();

    if (error) throw error;
    return siteFromRow(data);
  }

  async function softDeleteSite(siteId) {
    const sb = client();
    if (!sb) return null;

    const { error } = await sb
      .from("heritage_sites")
      .update({ is_deleted: true })
      .eq("id", siteId);

    if (error) throw error;
    return true;
  }

  async function listMedia(siteId) {
    const sb = client();
    if (!sb) return null;

    let query = sb
      .from("heritage_media")
      .select("*")
      .eq("is_deleted", false)
      .order("title", { ascending: true });

    if (siteId) query = query.eq("site_id", siteId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mediaFromRow);
  }

  async function upsertMedia(item) {
    const sb = client();
    if (!sb) return null;

    const { data, error } = await sb
      .from("heritage_media")
      .upsert(mediaToRow(item), { onConflict: "id" })
      .select("*")
      .single();

    if (error) throw error;
    return mediaFromRow(data);
  }

  async function softDeleteMedia(mediaId) {
    const sb = client();
    if (!sb) return null;

    const { error } = await sb
      .from("heritage_media")
      .update({ is_deleted: true })
      .eq("id", mediaId);

    if (error) throw error;
    return true;
  }

  async function getLeaderboard(limit = 50) {
    const sb = client();
    if (!sb) return null;

    const { data, error } = await sb
      .from("profiles")
      .select("username, display_name, heritage_points, avatar_url")
      .gt("heritage_points", 0)
      .order("heritage_points", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((row) => ({
      username: row.username,
      displayName: row.display_name,
      points: row.heritage_points,
      avatarUrl:
        row.avatar_url ||
        `https://i.pravatar.cc/150?u=${encodeURIComponent(row.username)}`,
    }));
  }

  async function getProfileStats() {
    const sb = client();
    if (!sb) return null;

    const [registered, players] = await Promise.all([
      sb.from("profiles").select("*", { count: "exact", head: true }),
      sb
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gt("heritage_points", 0),
    ]);

    if (registered.error) throw registered.error;
    if (players.error) throw players.error;

    return {
      registeredUsers: registered.count ?? 0,
      gamePlayers: players.count ?? 0,
    };
  }

  async function seedBuiltHeritageCatalog() {
    const sb = client();
    if (!sb) return null;

    const { data, error } = await sb.rpc("seed_built_heritage_catalog");
    if (error) throw error;
    return Number(data) || 0;
  }

  function bucketForMediaType(type) {
    if (type === "photo") return "heritage-photos";
    if (type === "map") return "heritage-maps";
    if (type === "model3d") return "heritage-models";
    if (type === "video") return "heritage-videos";
    if (type === "audio") return "heritage-audio";
    return "heritage-photos";
  }

  async function uploadFile(bucket, path, file, options = {}) {
    const sb = client();
    if (!sb) return null;

    const { data, error } = await sb.storage.from(bucket).upload(path, file, {
      upsert: options.upsert ?? true,
      contentType: file.type || options.contentType,
    });

    if (error) throw error;

    const { data: publicData } = sb.storage.from(bucket).getPublicUrl(data.path);
    return publicData.publicUrl;
  }

  async function uploadSiteMedia(siteId, type, file) {
    const bucket = bucketForMediaType(type);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${siteId}/${Date.now()}-${safeName}`;
    return uploadFile(bucket, path, file);
  }

  return {
    listSites,
    upsertSite,
    softDeleteSite,
    listMedia,
    upsertMedia,
    softDeleteMedia,
    getLeaderboard,
    getProfileStats,
    seedBuiltHeritageCatalog,
    uploadFile,
    uploadSiteMedia,
    siteFromRow,
    mediaFromRow,
  };
})();

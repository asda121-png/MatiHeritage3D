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
    const credit = row.credit || "";
    return {
      id: row.id,
      siteId: row.site_id,
      type: row.type,
      title: row.title,
      src: row.src,
      caption: row.caption || "",
      credit,
      year: row.year || "",
      // Gallery UI reads author; seed/credit both land in credit column.
      author: credit,
      date: row.year || "",
      sortOrder:
        row.sort_order == null ? null : Number(row.sort_order),
    };
  }

  function mediaToRow(item) {
    const row = {
      id: item.id,
      site_id: item.siteId,
      type: item.type,
      title: item.title,
      src: item.src,
      caption: item.caption || "",
      credit: item.credit || item.author || "",
      year: item.year || item.date || "",
      is_deleted: false,
    };
    if (item.sortOrder != null && Number.isFinite(Number(item.sortOrder))) {
      row.sort_order = Number(item.sortOrder);
    }
    return row;
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
      .order("sort_order", { ascending: true })
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

  async function setMediaSortOrder(siteId, type, orderedIds) {
    const sb = client();
    if (!sb) return null;

    const { data, error } = await sb.rpc("set_heritage_media_sort_order", {
      p_site_id: siteId,
      p_type: type,
      p_ordered_ids: orderedIds,
    });

    if (error) throw error;
    return Number(data) || 0;
  }

  function mapLeaderboardRow(row) {
    const username = row.username;
    return {
      username,
      displayName: row.display_name || row.displayName || username,
      points: Number(row.heritage_points ?? row.points) || 0,
      avatarUrl:
        row.avatar_url ||
        row.avatarUrl ||
        `https://i.pravatar.cc/150?u=${encodeURIComponent(username || "guest")}`,
      updatedAt: row.updated_at || row.updatedAt || null,
    };
  }

  async function getLeaderboard(limit = 50) {
    const sb = client();
    if (!sb) return null;

    // Prefer shared live board; fall back to Auth profiles if migration not applied yet.
    const primary = await sb
      .from("leaderboard_entries")
      .select("username, display_name, heritage_points, avatar_url, updated_at")
      .gt("heritage_points", 0)
      .order("heritage_points", { ascending: false })
      .limit(limit);

    if (!primary.error) {
      return (primary.data || []).map(mapLeaderboardRow);
    }

    const { data, error } = await sb
      .from("profiles")
      .select("username, display_name, heritage_points, avatar_url, updated_at")
      .gt("heritage_points", 0)
      .order("heritage_points", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(mapLeaderboardRow);
  }

  async function syncHeritagePoints({ username, points, displayName } = {}) {
    const sb = client();
    if (!sb) return null;

    const cleanUsername = String(username || "")
      .trim()
      .toLowerCase();
    if (!cleanUsername) return null;

    const { data, error } = await sb.rpc("sync_heritage_points", {
      p_username: cleanUsername,
      p_points: Math.max(0, Number(points) || 0),
      p_display_name: displayName || cleanUsername,
    });

    if (error) throw error;
    return mapLeaderboardRow(data || { username: cleanUsername, heritage_points: points });
  }

  function subscribeLeaderboard(onChange) {
    if (typeof onChange !== "function") return null;

    if (typeof MatiHeritageRealtime !== "undefined") {
      MatiHeritageRealtime.ensure();
      return MatiHeritageRealtime.on(
        MatiHeritageRealtime.TOPIC.leaderboard,
        onChange,
      );
    }

    const sb = client();
    if (!sb) return null;

    const channel = sb
      .channel("leaderboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaderboard_entries" },
        () => {
          onChange();
        },
      )
      .subscribe();

    return () => {
      try {
        sb.removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
  }

  function subscribeHeritageCatalog(onChange) {
    if (typeof onChange !== "function") return null;
    if (typeof MatiHeritageRealtime === "undefined") return null;
    MatiHeritageRealtime.ensure();
    return MatiHeritageRealtime.on(
      MatiHeritageRealtime.TOPIC.catalog,
      onChange,
    );
  }

  async function getProfileStats() {
    const sb = client();
    if (!sb) return null;

    const [registered, boardPlayers, profilePlayers] = await Promise.all([
      sb.from("profiles").select("*", { count: "exact", head: true }),
      sb
        .from("leaderboard_entries")
        .select("*", { count: "exact", head: true })
        .gt("heritage_points", 0),
      sb
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gt("heritage_points", 0),
    ]);

    if (registered.error) throw registered.error;

    const gamePlayers =
      !boardPlayers.error && boardPlayers.count != null
        ? boardPlayers.count
        : profilePlayers.error
          ? 0
          : profilePlayers.count ?? 0;

    const analytics = await getVisitorAnalytics().catch(() => null);

    return {
      registeredUsers: registered.count ?? 0,
      gamePlayers,
      ...(analytics || {}),
    };
  }

  async function getVisitorAnalytics() {
    const sb = client();
    if (!sb) return null;

    const { data, error } = await sb.rpc("get_visitor_analytics");
    if (error) throw error;
    if (!data || typeof data !== "object") return null;

    return {
      totalPageViews: Number(data.totalPageViews) || 0,
      uniqueSessions: Number(data.uniqueSessions) || 0,
      activeSessions: Number(data.activeSessions) || 0,
      pageVisits: Number(data.pageVisits ?? data.totalPageViews) || 0,
    };
  }

  async function recordPageVisit(sessionId, pagePath) {
    const sb = client();
    if (!sb) return null;

    const { data, error } = await sb.rpc("record_page_visit", {
      p_session_id: sessionId,
      p_page_path: pagePath || "/",
    });
    if (error) throw error;
    if (!data || typeof data !== "object") return null;

    return {
      totalPageViews: Number(data.totalPageViews) || 0,
      uniqueSessions: Number(data.uniqueSessions) || 0,
      activeSessions: Number(data.activeSessions) || 0,
      pageVisits: Number(data.pageVisits ?? data.totalPageViews) || 0,
    };
  }

  function subscribeVisitorAnalytics(onChange) {
    if (typeof onChange !== "function") return null;
    if (typeof MatiHeritageRealtime === "undefined") return null;
    MatiHeritageRealtime.ensure();
    return MatiHeritageRealtime.on(
      MatiHeritageRealtime.TOPIC.visitors,
      onChange,
    );
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

  function uploadFileWithProgress(bucket, path, file, options = {}) {
    const cfg = window.MATI_SUPABASE_CONFIG;
    if (!cfg?.url || !cfg?.anonKey) {
      return Promise.reject(new Error("Supabase is not configured."));
    }

    const endpoint = `${String(cfg.url).replace(/\/$/, "")}/storage/v1/object/${encodeURIComponent(bucket)}/${path
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/")}`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint, true);
      xhr.setRequestHeader("Authorization", `Bearer ${cfg.anonKey}`);
      xhr.setRequestHeader("apikey", cfg.anonKey);
      xhr.setRequestHeader(
        "x-upsert",
        options.upsert === false ? "false" : "true",
      );
      if (file.type || options.contentType) {
        xhr.setRequestHeader(
          "Content-Type",
          file.type || options.contentType,
        );
      }

      // Support upload cancellation via AbortSignal
      var signal = options.signal || null;
      if (signal) {
        if (signal.aborted) {
          return reject(new Error("Upload cancelled."));
        }
        signal.addEventListener("abort", function() { xhr.abort(); }, { once: true });
      }

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable || typeof options.onProgress !== "function") {
          return;
        }
        const pct = Math.max(
          0,
          Math.min(100, Math.round((event.loaded / event.total) * 100)),
        );
        options.onProgress(pct, {
          loaded: event.loaded,
          total: event.total,
        });
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (typeof options.onProgress === "function") {
            options.onProgress(100, { loaded: file.size, total: file.size });
          }
          resolve(path);
          return;
        }

        let message = `Upload failed (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText || "{}");
          message = body.error || body.message || message;
        } catch {
          /* keep default */
        }
        reject(new Error(message));
      };

      xhr.onerror = () => reject(new Error("Network error while uploading."));
      xhr.onabort = () => reject(new Error("Upload cancelled."));
      xhr.send(file);
    });
  }

  async function uploadFile(bucket, path, file, options = {}) {
    const sb = client();
    if (!sb) return null;

    if (typeof options.onProgress === "function") {
      await uploadFileWithProgress(bucket, path, file, options);
    } else {
      const { data, error } = await sb.storage.from(bucket).upload(path, file, {
        upsert: options.upsert ?? true,
        contentType: file.type || options.contentType,
      });
      if (error) throw error;
      path = data.path;
    }

    const { data: publicData } = sb.storage.from(bucket).getPublicUrl(path);
    return publicData.publicUrl;
  }

  async function uploadSiteMedia(siteId, type, file, options = {}) {
    const bucket = bucketForMediaType(type);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${siteId}/${Date.now()}-${safeName}`;
    return uploadFile(bucket, path, file, options);
  }

  return {
    listSites,
    upsertSite,
    softDeleteSite,
    listMedia,
    upsertMedia,
    softDeleteMedia,
    setMediaSortOrder,
    getLeaderboard,
    syncHeritagePoints,
    subscribeLeaderboard,
    subscribeHeritageCatalog,
    getProfileStats,
    getVisitorAnalytics,
    recordPageVisit,
    subscribeVisitorAnalytics,
    seedBuiltHeritageCatalog,
    uploadFile,
    uploadSiteMedia,
    siteFromRow,
    mediaFromRow,
  };
})();

(function bootVisitorAnalyticsScript() {
  if (typeof window === "undefined" || window.MatiVisitorAnalytics) return;
  if (/admin\.html/i.test(location.pathname)) return;

  const script = document.createElement("script");
  script.src = "visitor-analytics.js";
  script.defer = true;
  document.head.appendChild(script);
})();

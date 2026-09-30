export default async function handler(req, res) {
  const allowedOrigin = "https://geenopizza.github.io";

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { action, password, songs } = req.body || {};

    // Verifica password
    if (action === "login") {
      if (
        password &&
        password === process.env.SONGBOOK_ADMIN_PASSWORD
      ) {
        return res.status(200).json({
          success: true
        });
      }

      return res.status(401).json({
        success: false,
        error: "Password non valida"
      });
    }

    // Salvataggio
    if (action !== "save") {
      return res.status(400).json({
        error: "Azione non valida"
      });
    }

    if (
      !password ||
      password !== process.env.SONGBOOK_ADMIN_PASSWORD
    ) {
      return res.status(401).json({
        error: "Password non valida"
      });
    }

    if (!Array.isArray(songs)) {
      return res.status(400).json({
        error: "Dati non validi"
      });
    }

    const token = process.env.SONGBOOK_GITHUB_TOKEN;

    if (!token) {
      return res.status(500).json({
        error: "Token GitHub mancante"
      });
    }

    const owner = "GeenoPizza";
    const repo = "lemonbox-songbook";
    const path = "songs.json";

    const headers = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    };

    const fileResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers }
    );

    if (!fileResponse.ok) {
      const errorText = await fileResponse.text();

      return res.status(500).json({
        error: "Impossibile leggere songs.json",
        details: errorText
      });
    }

    const file = await fileResponse.json();

    const content = Buffer
      .from(JSON.stringify(songs, null, 2), "utf8")
      .toString("base64");

    const updateResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: "Update Lemon Box Songbook",
          content,
          sha: file.sha
        })
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();

      return res.status(500).json({
        error: "Impossibile salvare su GitHub",
        details: errorText
      });
    }

   const updatedFile = await updateResponse.json();

return res.status(200).json({
  success: true,
  message: "GitHub aggiornato",
  commit: updatedFile.commit
    ? updatedFile.commit.sha
    : null,
  file: updatedFile.content
    ? updatedFile.content.sha
    : null
});

  } catch (error) {

    return res.status(500).json({
      error: "Errore interno",
      details: error.message
    });
  }
}

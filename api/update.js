export default async function handler(req, res) {

  const allowedOrigin =
    "https://geenopizza.github.io";

  res.setHeader(
    "Access-Control-Allow-Origin",
    allowedOrigin
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );


  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }


  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }


  try {

    const body =
      req.body || {};

    const action =
      body.action;

    const password =
      body.password;

    const songs =
      body.songs;


    /* =========================
       LOGIN
       ========================= */

    if (action === "login") {

      if (
        password &&
        password ===
          process.env.SONGBOOK_ADMIN_PASSWORD
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


    /* =========================
       SAVE
       ========================= */

    if (action !== "save") {

      return res.status(400).json({
        success: false,
        error: "Azione non valida"
      });

    }


    if (
      !password ||
      password !==
        process.env.SONGBOOK_ADMIN_PASSWORD
    ) {

      return res.status(401).json({
        success: false,
        error: "Password non valida"
      });

    }


    if (!Array.isArray(songs)) {

      return res.status(400).json({
        success: false,
        error: "songs non è un array"
      });

    }


    /* =========================
       GITHUB TOKEN
       ========================= */

    const token =
      process.env.SONGBOOK_GITHUB_TOKEN;


    if (!token) {

      return res.status(500).json({
        success: false,
        error: "Token GitHub mancante"
      });

    }


    const owner =
      "GeenoPizza";

    const repo =
      "lemonbox-songbook";

    const path =
      "songs.json";


    const githubHeaders = {

      "Authorization":
        `Bearer ${token}`,

      "Accept":
        "application/vnd.github+json",

      "X-GitHub-Api-Version":
        "2022-11-28",

      "Content-Type":
        "application/json"

    };


    /* =========================
       READ CURRENT FILE
       ========================= */

    const readUrl =
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;


    const fileResponse =
      await fetch(
        readUrl,
        {
          method: "GET",
          headers: githubHeaders
        }
      );


    if (!fileResponse.ok) {

      const details =
        await fileResponse.text();

      return res.status(500).json({
        success: false,
        error:
          "GitHub non permette di leggere songs.json",
        details
      });

    }


    const file =
      await fileResponse.json();


    if (!file.sha) {

      return res.status(500).json({
        success: false,
        error:
          "GitHub non ha restituito lo SHA di songs.json"
      });

    }


    /* =========================
       PREPARE FILE
       ========================= */

    const json =
      JSON.stringify(
        songs,
        null,
        2
      );


    const content =
      Buffer
        .from(json, "utf8")
        .toString("base64");


    /* =========================
       WRITE FILE
       ========================= */

    const updateResponse =
      await fetch(
        readUrl,
        {
          method: "PUT",

          headers: githubHeaders,

          body: JSON.stringify({

            message:
              "Update Lemon Box Songbook",

            content:
              content,

            sha:
              file.sha

          })

        }
      );


    const responseText =
      await updateResponse.text();


    if (!updateResponse.ok) {

      return res.status(500).json({

        success: false,

        error:
          "GitHub ha rifiutato il salvataggio",

        status:
          updateResponse.status,

        details:
          responseText

      });

    }


    let updatedFile;

    try {

      updatedFile =
        JSON.parse(responseText);

    } catch {

      return res.status(500).json({

        success: false,

        error:
          "GitHub ha risposto in modo inatteso",

        details:
          responseText

      });

    }


    /* =========================
       VERIFY RESPONSE
       ========================= */

    if (
      !updatedFile.content ||
      !updatedFile.content.sha
    ) {

      return res.status(500).json({

        success: false,

        error:
          "GitHub non ha confermato l'aggiornamento del file",

        details:
          responseText

      });

    }


    return res.status(200).json({

      success: true,

      message:
        "GitHub aggiornato correttamente",

      fileSha:
        updatedFile.content.sha,

      commitSha:
        updatedFile.commit
          ? updatedFile.commit.sha
          : null

    });


  } catch (error) {

    return res.status(500).json({

      success: false,

      error:
        "Errore interno",

      details:
        error.message

    });

  }

}

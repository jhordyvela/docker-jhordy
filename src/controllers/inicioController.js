import pool from "../config/database.js";

// GET público
export const getInicio = async (req, res) => {
  try {
    const heroResult = await pool.query(
      `SELECT * FROM inicio_hero ORDER BY id ASC LIMIT 1`
    );

    const bannerResult = await pool.query(
      `SELECT * FROM inicio_banner ORDER BY id ASC LIMIT 1`
    );

    return res.json({
      hero: heroResult.rows[0] || null,
      banner: bannerResult.rows[0] || null
    });
  } catch (error) {
    console.error("getInicio error:", error);
    return res.status(500).json({ error: "Error obteniendo inicio" });
  }
};

// ADMIN update hero
export const actualizarHero = async (req, res) => {
  try {
    const {
      titulo,
      resaltado,
      subtitulo,
      boton_1_texto,
      boton_1_link,
      boton_2_texto,
      boton_2_link
    } = req.body;

    const result = await pool.query(
      `UPDATE inicio_hero
       SET titulo = $1,
           resaltado = $2,
           subtitulo = $3,
           boton_1_texto = $4,
           boton_1_link = $5,
           boton_2_texto = $6,
           boton_2_link = $7,
           actualizado_en = NOW()
       WHERE id = 1
       RETURNING *`,
      [
        titulo,
        resaltado,
        subtitulo,
        boton_1_texto,
        boton_1_link,
        boton_2_texto,
        boton_2_link
      ]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("actualizarHero error:", error);
    return res.status(500).json({ error: "Error actualizando hero" });
  }
};

// ADMIN update banner
export const actualizarBanner = async (req, res) => {
  try {
    const { titulo, subtitulo, boton_texto, boton_link } = req.body;

    const result = await pool.query(
      `UPDATE inicio_banner
       SET titulo = $1,
           subtitulo = $2,
           boton_texto = $3,
           boton_link = $4,
           actualizado_en = NOW()
       WHERE id = 1
       RETURNING *`,
      [titulo, subtitulo, boton_texto, boton_link]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("actualizarBanner error:", error);
    return res.status(500).json({ error: "Error actualizando banner" });
  }
};
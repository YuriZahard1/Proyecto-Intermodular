import "dotenv/config";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("Falta JWT_SECRET en el archivo .env");

const app = express();
app.use(express.json());

type PeticionAuth = Request & { usuarioId?: number };

const crearToken = (id: number) => jwt.sign({ id }, JWT_SECRET, { expiresIn: "7d" });
const emailValido = (email: string) => /^\S+@\S+\.\S+$/.test(email);

// Middleware: exige un token válido y deja el id del usuario en req.usuarioId
function requiereSesion(req: PeticionAuth, res: Response, next: NextFunction) {
  const cabecera = req.headers.authorization ?? "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : "";
  try {
    const datos = jwt.verify(token, JWT_SECRET!) as unknown as { id: number };
    req.usuarioId = datos.id;
    next();
  } catch {
    res.status(401).json({ error: "Sesión no válida. Inicia sesión de nuevo." });
  }
}

// ---------- Prueba de conexión ----------
app.get("/api/salud", async (_req, res) => {
  try {
    res.json({ ok: true, usuarios: await prisma.usuarios.count() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: "No se pudo conectar con la base de datos" });
  }
});

// ---------- Registro ----------
app.post("/api/auth/registro", async (req, res) => {
  const { nombreUsuario, email, contrasena } = req.body ?? {};
  if (
    typeof nombreUsuario !== "string" || nombreUsuario.trim().length < 3 || nombreUsuario.trim().length > 30 ||
    typeof email !== "string" || !emailValido(email.trim()) ||
    typeof contrasena !== "string" || contrasena.length < 8
  ) {
    res.status(400).json({ error: "Datos de registro no válidos." });
    return;
  }
  try {
    const nombre = nombreUsuario.trim();
    const correo = email.trim().toLowerCase();
    const existe = await prisma.usuarios.findFirst({
      where: { OR: [{ email: correo }, { nombre_usuario: nombre }] },
    });
    if (existe) {
      res.status(409).json({ error: "Ese correo o nombre de usuario ya está registrado." });
      return;
    }
    const hash = await bcrypt.hash(contrasena, 10);
    const usuario = await prisma.usuarios.create({
      data: { nombre_usuario: nombre, email: correo, contrasena_hash: hash },
    });
    res.status(201).json({
      token: crearToken(usuario.id),
      usuario: { id: usuario.id, nombreUsuario: usuario.nombre_usuario },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No se pudo crear la cuenta." });
  }
});

// ---------- Login ----------
app.post("/api/auth/login", async (req, res) => {
  const { email, contrasena } = req.body ?? {};
  if (typeof email !== "string" || typeof contrasena !== "string") {
    res.status(400).json({ error: "Introduce correo y contraseña." });
    return;
  }
  try {
    const usuario = await prisma.usuarios.findFirst({
      where: { email: email.trim().toLowerCase() },
    });
    const correcta = usuario ? await bcrypt.compare(contrasena, usuario.contrasena_hash) : false;
    if (!usuario || !correcta) {
      res.status(401).json({ error: "Correo o contraseña incorrectos." });
      return;
    }
    res.json({
      token: crearToken(usuario.id),
      usuario: { id: usuario.id, nombreUsuario: usuario.nombre_usuario },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No se pudo iniciar sesión." });
  }
});

// ---------- Quién soy (para recuperar la sesión al recargar) ----------
app.get("/api/auth/yo", requiereSesion, async (req: PeticionAuth, res) => {
  try {
    const usuario = await prisma.usuarios.findFirst({ where: { id: req.usuarioId } });
    if (!usuario) {
      res.status(401).json({ error: "Usuario no encontrado." });
      return;
    }
    res.json({ id: usuario.id, nombreUsuario: usuario.nombre_usuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error del servidor." });
  }
});

// ---------- Partidas DEL USUARIO LOGUEADO ----------
app.get("/api/partidas", requiereSesion, async (req: PeticionAuth, res) => {
  try {
    const partidas = await prisma.partidas.findMany({
      where: { usuario_id: req.usuarioId },
      orderBy: { fecha: "desc" },
      take: 50,
    });
    res.json(
      partidas.map((p) => ({
        id: p.id,
        fecha: p.fecha,
        resultado: p.resultado,
        esBlackjack: p.es_blackjack,
        puntosJugador: p.puntos_jugador,
        puntosBanca: p.puntos_banca,
        numManos: p.num_manos,
      })),
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al leer las partidas." });
  }
});

app.post("/api/partidas", requiereSesion, async (req: PeticionAuth, res) => {
  const { resultado, esBlackjack, puntosJugador, puntosBanca, numManos } = req.body ?? {};
  const puntosOk = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 31;
  if (
    !["victoria", "derrota", "empate"].includes(resultado) ||
    !puntosOk(puntosJugador) || !puntosOk(puntosBanca) ||
    ![1, 2].includes(numManos ?? 1)
  ) {
    res.status(400).json({ error: "Datos de partida no válidos." });
    return;
  }
  try {
    const partida = await prisma.partidas.create({
      data: {
        usuario_id: req.usuarioId!,
        resultado,
        es_blackjack: Boolean(esBlackjack),
        puntos_jugador: puntosJugador,
        puntos_banca: puntosBanca,
        num_manos: numManos ?? 1,
      },
    });
    res.status(201).json({ id: partida.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No se pudo guardar la partida." });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`API lista en http://localhost:${PORT}`));
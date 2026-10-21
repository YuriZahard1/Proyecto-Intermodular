import type { MatchRecord, MatchResult } from "./mockData"
import type { RoundResult } from "./game"

const CLAVE_TOKEN = "blackjack-token"

export type Usuario = { id: number; nombreUsuario: string }

export type RondaTerminada = {
  result: RoundResult
  isBlackjack: boolean
  playerScore: number
  dealerScore: number
  hands: number
}

export const hayToken = () => Boolean(localStorage.getItem(CLAVE_TOKEN))
export const cerrarSesion = () => localStorage.removeItem(CLAVE_TOKEN)

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(CLAVE_TOKEN)
  const res = await fetch(`/api${ruta}`, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const datos = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(datos.error ?? "No se pudo conectar con el servidor")
  return datos as T
}

type RespuestaAuth = { token: string; usuario: Usuario }

export async function registrar(nombreUsuario: string, email: string, contrasena: string) {
  const r = await pedir<RespuestaAuth>("/auth/registro", {
    method: "POST",
    body: JSON.stringify({ nombreUsuario, email, contrasena }),
  })
  localStorage.setItem(CLAVE_TOKEN, r.token)
  return r.usuario
}

export async function iniciarSesion(email: string, contrasena: string) {
  const r = await pedir<RespuestaAuth>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, contrasena }),
  })
  localStorage.setItem(CLAVE_TOKEN, r.token)
  return r.usuario
}

export const obtenerYo = () => pedir<Usuario>("/auth/yo")

type PartidaServidor = {
  id: number
  fecha: string
  resultado: "victoria" | "derrota" | "empate"
  puntosJugador: number
  puntosBanca: number
  numManos: number
}

export async function obtenerPartidas(): Promise<MatchRecord[]> {
  const lista = await pedir<PartidaServidor[]>("/partidas")
  return lista.map((p) => ({
    id: p.id,
    date: new Date(p.fecha).toLocaleString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    result: (p.resultado[0].toUpperCase() + p.resultado.slice(1)) as MatchResult,
    playerScore: p.puntosJugador,
    dealerScore: p.puntosBanca,
    hands: p.numManos,
    name: `Partida #${p.id}`,
  }))
}

export async function guardarPartida(ronda: RondaTerminada) {
  const resultado = { win: "victoria", loss: "derrota", draw: "empate" }[ronda.result]
  await pedir("/partidas", {
    method: "POST",
    body: JSON.stringify({
      resultado,
      esBlackjack: ronda.isBlackjack,
      puntosJugador: ronda.playerScore,
      puntosBanca: ronda.dealerScore,
      numManos: ronda.hands,
    }),
  })
}
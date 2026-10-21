import {
  cerrarSesion,
  guardarPartida,
  hayToken,
  iniciarSesion,
  obtenerPartidas,
  obtenerYo,
  registrar,
  type RondaTerminada,
  type Usuario,
} from "./api";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createDeck,
  getResult,
  handValue,
  isBlackjack,
  suitSymbols,
  type PlayingCard,
  type RoundResult,
} from "./game";
import { mockMatches, type MatchRecord } from "./mockData";

type Page = "home" | "login" | "register" | "game" | "style";
type ModalName = "rules" | null;

const pageFromHash = (): Page => {
  const value = window.location.hash.replace("#/", "");
  return ["home", "login", "register", "game", "style"].includes(value)
    ? (value as Page)
    : "home";
};

function navigate(page: Page) {
  window.location.hash = `/${page}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function Button({
  children,
  variant = "primary",
  type = "button",
  disabled,
  onClick,
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      className={`button button--${variant} ${className}`}
      type={type}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  type = "text",
  placeholder,
  message,
  valid,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  message?: string;
  valid?: boolean;
}) {
  const state = message ? (valid ? "success" : "error") : "";
  return (
    <div className={`field ${state ? `field--${state}` : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={state === "error"}
        aria-describedby={message ? `${id}-message` : undefined}
      />
      {message && (
        <p
          className="field__message"
          id={`${id}-message`}
          role={valid ? undefined : "alert"}
        >
          <span aria-hidden="true">{valid ? "✓" : "!"}</span> {message}
        </p>
      )}
    </div>
  );
}

function Header({
  onRules,
  usuario,
  onLogout,
}: {
  onRules: () => void;
  usuario: Usuario | null;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const go = (page: Page) => {
    setOpen(false);
    navigate(page);
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <button
          className="brand"
          onClick={() => go("home")}
          aria-label="Ir al inicio"
        >
          <span className="brand__mark" aria-hidden="true">
            A♠
          </span>
          <span>Veintiuno</span>
        </button>
        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="main-nav"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen(!open)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav
          id="main-nav"
          className={`main-nav ${open ? "main-nav--open" : ""}`}
          aria-label="Navegación principal"
        >
          <button onClick={() => go("home")}>Inicio</button>
          <button onClick={() => go("game")}>Nueva partida</button>
          <button
            onClick={() => {
              setOpen(false);
              onRules();
            }}
          >
            Reglas
          </button>
          {usuario ? (
            <button
              className="nav-login"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              title={`Sesión iniciada como ${usuario.nombreUsuario}`}
            >
              Salir ({usuario.nombreUsuario})
            </button>
          ) : (
            <button className="nav-login" onClick={() => go("login")}>
              Entrar
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <strong className="footer-brand">Veintiuno</strong>
          <p>Blackjack clásico. Nada más.</p>
        </div>
        <button onClick={() => navigate("style")}>Guía de estilos</button>
        <p>Juego responsable · Sin apuestas</p>
      </div>
    </footer>
  );
}

function Modal({
  title,
  children,
  onClose,
  actions,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
}) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal__header">
          <h2 id="modal-title">{title}</h2>
          <button
            className="icon-button"
            aria-label="Cerrar modal"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {actions && <div className="modal__actions">{actions}</div>}
      </section>
    </div>
  );
}

function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Reglas del Blackjack"
      onClose={onClose}
      actions={<Button onClick={onClose}>Entendido</Button>}
    >
      <div className="rules-list">
        <div>
          <span>01</span>
          <p>
            <strong>El objetivo</strong>Acércate a 21 sin pasarte y supera la
            puntuación de la banca.
          </p>
        </div>
        <div>
          <span>02</span>
          <p>
            <strong>Valor de las cartas</strong>Las figuras valen 10. El As vale
            1 u 11, lo que más te convenga.
          </p>
        </div>
        <div>
          <span>03</span>
          <p>
            <strong>Tus acciones</strong>Puedes pedir, plantarte, doblar con tus
            dos primeras cartas o dividir una pareja de igual valor.
          </p>
        </div>
        <div>
          <span>04</span>
          <p>
            <strong>Blackjack natural</strong>Un As y una carta de valor 10 en
            el reparto inicial vencen a cualquier 21 de tres o más cartas.
          </p>
        </div>
        <div>
          <span>05</span>
          <p>
            <strong>La banca</strong>Roba hasta alcanzar 17 o más. Si te pasas
            de 21, pierdes esa mano al instante.
          </p>
        </div>
      </div>
    </Modal>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone?: string;
}) {
  return (
    <div className={`stat ${tone ? `stat--${tone}` : ""}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function MatchCard({ match }: { match: MatchRecord }) {
  const tone =
    match.result === "Victoria"
      ? "win"
      : match.result === "Derrota"
        ? "loss"
        : "draw";
  return (
    <article className="match-card">
      <div className="match-card__top">
        <span className={`badge badge--${tone}`}>
          <i />
          {match.result}
        </span>
        <span className="match-card__date">{match.date}</span>
      </div>
      <h3>{match.name}</h3>
      <div className="scoreline">
        <div>
          <span>Tú</span>
          <strong>{match.playerScore}</strong>
        </div>
        <span className="scoreline__vs">VS</span>
        <div>
          <span>Banca</span>
          <strong>{match.dealerScore}</strong>
        </div>
      </div>
      <div className="match-card__bottom">
        <span>
          {match.hands} {match.hands === 1 ? "mano" : "manos"}
        </span>
        <button onClick={() => navigate("game")}>
          Ver detalle <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
}

function HomePage({
  sessionMatches,
  partidas,
  usuario,
}: {
  sessionMatches: RoundResult[];
  partidas: MatchRecord[];
  usuario: Usuario | null;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todas");
  // Con sesión iniciada se muestran SUS partidas; sin sesión, las de ejemplo
  const fuente = usuario ? partidas : mockMatches;
  const matches = useMemo(
    () =>
      fuente.filter(
        (match) =>
          (filter === "Todas" || match.result === filter.slice(0, -1)) &&
          match.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, filter, fuente],
  );
  const wins = sessionMatches.filter((result) => result === "win").length;
  const losses = sessionMatches.filter((result) => result === "loss").length;
  const draws = sessionMatches.filter((result) => result === "draw").length;

  return (
    <main>
      <section className="hero">
        <div className="hero__content">
          <p className="eyebrow">Blackjack clásico</p>
          <h1>
            Decide bien.
            <br />
            <em>Gana con estilo.</em>
          </h1>
          <p className="hero__copy">
            La esencia del Blackjack, sin distracciones. Aprende las reglas,
            juega tu mano y trata de vencer a la banca.
          </p>
          <Button onClick={() => navigate("game")}>
            Nueva partida <span aria-hidden="true">➤</span>
          </Button>
        </div>
        <div className="hero-cards" aria-hidden="true">
          <PlayingCardView
            card={{ id: "hero-a", rank: "A", suit: "spades" }}
            decorative
          />
          <PlayingCardView
            card={{ id: "hero-k", rank: "K", suit: "hearts" }}
            decorative
          />
          <span className="twenty-one">21</span>
        </div>
      </section>

      <section
        className="dashboard content-shell"
        aria-labelledby="session-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Tu actividad</p>
            <h2 id="session-title">Resumen de la sesión</h2>
          </div>
          <p>Las estadísticas se reinician al recargar la página.</p>
        </div>
        <div className="stats-grid">
          <Stat value={sessionMatches.length} label="Partidas jugadas" />
          <Stat value={wins} label="Ganadas" tone="win" />
          <Stat value={losses} label="Perdidas" tone="loss" />
          <Stat value={draws} label="Empatadas" tone="draw" />
        </div>

        <div className="history-heading">
          <div>
            <p className="eyebrow">
              {usuario
                ? `Historial de ${usuario.nombreUsuario}`
                : "Historial de ejemplo"}
            </p>
            <h2>Partidas recientes</h2>
          </div>
          <label className="search">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">Buscar partida</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre..."
            />
          </label>
        </div>
        <div className="filters" aria-label="Filtrar partidas">
          {["Todas", "Victorias", "Derrotas", "Empates"].map((item) => (
            <button
              key={item}
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {matches.length > 0 ? (
          <div className="match-grid">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span aria-hidden="true">♠</span>
            <h3>No hay partidas</h3>
            <p>
              {usuario && partidas.length === 0
                ? "Aún no has jugado ninguna partida. ¡Juega una y aparecerá aquí!"
                : "Prueba con otra búsqueda o cambia el filtro seleccionado."}
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setFilter("Todas");
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}

function AuthShell({
  eyebrow,
  title,
  copy,
  children,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-intro">
        <button className="auth-brand" onClick={() => navigate("home")}>
          <span>A♠</span> Veintiuno
        </button>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{copy}</p>
        </div>
        <blockquote>
          “En el Blackjack, como en la vida, saber cuándo plantarse lo es todo.”
        </blockquote>
      </section>
      <section className="auth-form-wrap">{children}</section>
    </main>
  );
}

function LoginPage({ onAuth }: { onAuth: (usuario: Usuario) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const emailError = !email
    ? "Introduce tu correo electrónico."
    : !/^\S+@\S+\.\S+$/.test(email)
      ? "El formato del correo no es válido."
      : "";
  const passwordError = !password
    ? "Introduce tu contraseña."
    : password.length < 8
      ? "Debe tener al menos 8 caracteres."
      : "";
  return (
    <AuthShell
      eyebrow="Bienvenido de nuevo"
      title="Entra en tu cuenta"
      copy="Continúa donde lo dejaste y juega una nueva mano."
    >
      <form
        className="form-card"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setTouched({ email: true, password: true });
          if (emailError || passwordError) return;
          setServerError("");
          setLoading(true);
          iniciarSesion(email.trim(), password)
            .then((usuario) => {
              onAuth(usuario);
              navigate("home");
            })
            .catch((error: Error) => setServerError(error.message))
            .finally(() => setLoading(false));
        }}
      >
        <div className="form-heading">
          <h2>Iniciar sesión</h2>
          <p>Introduce tus datos para continuar.</p>
        </div>
        <Field
          label="Correo electrónico"
          id="login-email"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value);
            setTouched({ ...touched, email: true });
          }}
          placeholder="tu@correo.com"
          message={touched.email ? emailError || "Correo válido." : undefined}
          valid={!emailError}
        />
        <Field
          label="Contraseña"
          id="login-password"
          type="password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setTouched({ ...touched, password: true });
          }}
          placeholder="8 caracteres como mínimo"
          message={
            touched.password ? passwordError || "Contraseña válida." : undefined
          }
          valid={!passwordError}
        />
        <button type="button" className="text-link form-link">
          ¿Has olvidado tu contraseña?
        </button>
        {serverError && (
          <p className="checkbox-error" role="alert">
            {serverError}
          </p>
        )}
        <Button type="submit" className="button--full" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
        <p className="form-switch">
          ¿Aún no tienes cuenta?{" "}
          <button type="button" onClick={() => navigate("register")}>
            Crear una cuenta
          </button>
        </p>
      </form>
    </AuthShell>
  );
}

function RegisterPage({ onAuth }: { onAuth: (usuario: Usuario) => void }) {
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [terms, setTerms] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors: Record<string, string> = {
    name: values.name.length < 3 ? "Usa al menos 3 caracteres." : "",
    email: !/^\S+@\S+\.\S+$/.test(values.email)
      ? "Introduce un correo electrónico válido."
      : "",
    password:
      values.password.length < 8
        ? "La contraseña debe tener al menos 8 caracteres."
        : "",
    confirm:
      values.confirm !== values.password || !values.confirm
        ? "Las contraseñas no coinciden."
        : "",
  };
  const update = (key: keyof typeof values, value: string) => {
    setValues({ ...values, [key]: value });
    setTouched({ ...touched, [key]: true });
  };
  return (
    <AuthShell
      eyebrow="Empieza a jugar"
      title="Crea tu cuenta"
      copy="Practica tu estrategia y disfruta del Blackjack más puro."
    >
      <form
        className="form-card form-card--register"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setTouched({
            name: true,
            email: true,
            password: true,
            confirm: true,
            terms: true,
          });
          if (Object.values(errors).some(Boolean) || !terms) return;
          setServerError("");
          setLoading(true);
          registrar(values.name.trim(), values.email.trim(), values.password)
            .then((usuario) => {
              onAuth(usuario);
              navigate("home");
            })
            .catch((error: Error) => setServerError(error.message))
            .finally(() => setLoading(false));
        }}
      >
        <div className="form-heading">
          <h2>Registro</h2>
          <p>Todos los campos son necesarios.</p>
        </div>
        <Field
          label="Nombre de usuario"
          id="name"
          value={values.name}
          onChange={(value) => update("name", value)}
          placeholder="Tu nombre en la mesa"
          message={
            touched.name ? errors.name || "Nombre disponible." : undefined
          }
          valid={!errors.name}
        />
        <Field
          label="Correo electrónico"
          id="email"
          type="email"
          value={values.email}
          onChange={(value) => update("email", value)}
          placeholder="tu@correo.com"
          message={touched.email ? errors.email || "Correo válido." : undefined}
          valid={!errors.email}
        />
        <div className="form-row">
          <Field
            label="Contraseña"
            id="password"
            type="password"
            value={values.password}
            onChange={(value) => update("password", value)}
            placeholder="Mínimo 8 caracteres"
            message={
              touched.password
                ? errors.password || "Contraseña segura."
                : undefined
            }
            valid={!errors.password}
          />
          <Field
            label="Repetir contraseña"
            id="confirm"
            type="password"
            value={values.confirm}
            onChange={(value) => update("confirm", value)}
            placeholder="Repite la contraseña"
            message={
              touched.confirm
                ? errors.confirm || "Las contraseñas coinciden."
                : undefined
            }
            valid={!errors.confirm}
          />
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={terms}
            onChange={(event) => {
              setTerms(event.target.checked);
              setTouched({ ...touched, terms: true });
            }}
          />
          <span>Acepto los términos de uso y la política de privacidad.</span>
        </label>
        {touched.terms && !terms && (
          <p className="checkbox-error">
            Debes aceptar los términos para continuar.
          </p>
        )}
        {serverError && (
          <p className="checkbox-error" role="alert">
            {serverError}
          </p>
        )}
        <Button type="submit" className="button--full" disabled={loading}>
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </Button>
        <p className="form-switch">
          ¿Ya tienes cuenta?{" "}
          <button type="button" onClick={() => navigate("login")}>
            Inicia sesión
          </button>
        </p>
      </form>
    </AuthShell>
  );
}

function PlayingCardView({
  card,
  hidden = false,
  decorative = false,
  fresh = false,
}: {
  card: PlayingCard;
  hidden?: boolean;
  decorative?: boolean;
  fresh?: boolean;
}) {
  if (hidden)
    return (
      <div
        className="playing-card playing-card--back"
        aria-label="Carta oculta"
      >
        <span>V</span>
        <i>♠</i>
      </div>
    );
  const red = card.suit === "hearts" || card.suit === "diamonds";
  return (
    <div
      className={`playing-card ${red ? "playing-card--red" : ""} ${
        fresh ? "playing-card--fresh" : ""
      }`}
      aria-label={decorative ? undefined : `${card.rank} de ${card.suit}`}
    >
      <div className="card-corner">
        <strong>{card.rank}</strong>
        <span>{suitSymbols[card.suit]}</span>
      </div>
      <span className="card-suit">{suitSymbols[card.suit]}</span>
    </div>
  );
}

function GamePage({ onResult }: { onResult: (ronda: RondaTerminada) => void }) {
  type HandStatus = "active" | "stood" | "bust";
  type PlayerHand = {
    id: number;
    cards: PlayingCard[];
    status: HandStatus;
    fromSplit: boolean;
  };

  const shoeRef = useRef<PlayingCard[]>([]);
  const phaseRef = useRef<"player" | "dealer" | "done">("player");
  const roundFinishedRef = useRef(false);
  const initializedRef = useRef(false);
  const mountedRef = useRef(false);
  const resultTimerRef = useRef<number | undefined>(undefined);
  const handIdRef = useRef(2);
  const [hands, setHands] = useState<PlayerHand[]>([]);
  const [activeHand, setActiveHand] = useState(0);
  const [dealer, setDealer] = useState<PlayingCard[]>([]);
  const [phase, setPhase] = useState<"player" | "dealer" | "done">("player");
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [handResults, setHandResults] = useState<RoundResult[]>([]);
  const [resultLabel, setResultLabel] = useState("Tu turno");
  const [freshId, setFreshId] = useState("");
  const [gameModal, setGameModal] = useState<"leave" | "result" | null>(null);

  const setGamePhase = (nextPhase: "player" | "dealer" | "done") => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  };

  const finishRound = useCallback(
    (
      results: RoundResult[],
      label: string | undefined,
      playerHands: PlayingCard[][],
      dealerCards: PlayingCard[],
    ) => {
      if (roundFinishedRef.current || !mountedRef.current) return;
      roundFinishedRef.current = true;
      const wins = results.filter((result) => result === "win").length;
      const losses = results.filter((result) => result === "loss").length;
      const aggregate: RoundResult =
        wins > losses ? "win" : losses > wins ? "loss" : "draw";
      phaseRef.current = "done";
      setPhase("done");
      setRoundResult(aggregate);
      setHandResults(results);
      setResultLabel(
        label ||
          (aggregate === "win"
            ? "Has ganado"
            : aggregate === "loss"
              ? "Has perdido"
              : "Empate"),
      );
      const scores = playerHands.map((cards) => handValue(cards));
      const validos = scores.filter((score) => score <= 21);
      onResult({
        result: aggregate,
        isBlackjack: playerHands.length === 1 && isBlackjack(playerHands[0]),
        playerScore: Math.min(
          validos.length ? Math.max(...validos) : scores[0],
          31,
        ),
        dealerScore: Math.min(handValue(dealerCards), 31),
        hands: Math.min(playerHands.length, 2),
      });
      resultTimerRef.current = window.setTimeout(
        () => setGameModal("result"),
        650,
      );
    },
    [onResult],
  );

  const newRound = useCallback(() => {
    window.clearTimeout(resultTimerRef.current);
    setGameModal(null);
    roundFinishedRef.current = false;
    if (shoeRef.current.length < 52) shoeRef.current = createDeck(6);
    const dealt = shoeRef.current.splice(0, 4);
    const nextPlayer = [dealt[0], dealt[2]];
    const nextDealer = [dealt[1], dealt[3]];
    handIdRef.current += 1;
    setHands([
      {
        id: handIdRef.current,
        cards: nextPlayer,
        status: "active",
        fromSplit: false,
      },
    ]);
    setActiveHand(0);
    setDealer(nextDealer);
    setRoundResult(null);
    setHandResults([]);
    setGamePhase("player");
    setResultLabel("Tu turno");

    const dealerHasBlackjack = isBlackjack(nextDealer);
    const playerHasBlackjack = isBlackjack(nextPlayer);
    const dealerUpCardCanPeek =
      nextDealer[0].rank === "A" ||
      ["10", "J", "Q", "K"].includes(nextDealer[0].rank);
    if (dealerUpCardCanPeek && dealerHasBlackjack) {
      finishRound(
        [playerHasBlackjack ? "draw" : "loss"],
        playerHasBlackjack ? "Empate" : "Blackjack de la banca",
        [nextPlayer],
        nextDealer,
      );
    } else if (playerHasBlackjack) {
      finishRound(["win"], "¡Blackjack!", [nextPlayer], nextDealer);
    }
  }, [finishRound]);

  useEffect(() => {
    mountedRef.current = true;
    if (!initializedRef.current) {
      initializedRef.current = true;
      newRound();
    } else if (roundFinishedRef.current) {
      resultTimerRef.current = window.setTimeout(
        () => setGameModal("result"),
        650,
      );
    }
    return () => {
      mountedRef.current = false;
      window.clearTimeout(resultTimerRef.current);
    };
  }, [newRound]);

  const dealerTurn = useCallback(
    async (currentHands: PlayerHand[]) => {
      if (phaseRef.current !== "player" || roundFinishedRef.current) return;
      if (currentHands.every((hand) => hand.status === "bust")) {
        finishRound(
          currentHands.map(() => "loss"),
          undefined,
          currentHands.map((hand) => hand.cards),
          dealer,
        );
        return;
      }

      setGamePhase("dealer");
      setResultLabel("Turno de la banca");
      let currentDealer = [...dealer];
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      while (
        mountedRef.current &&
        handValue(currentDealer) < 17 &&
        shoeRef.current.length > 0
      ) {
        const card = shoeRef.current.shift()!;
        currentDealer = [...currentDealer, card];
        setDealer(currentDealer);
        setFreshId(card.id);
        await new Promise((resolve) => window.setTimeout(resolve, 700));
      }
      if (!mountedRef.current) return;
      const results = currentHands.map((hand) =>
        hand.status === "bust" ? "loss" : getResult(hand.cards, currentDealer),
      );
      finishRound(
        results,
        undefined,
        currentHands.map((hand) => hand.cards),
        currentDealer,
      );
    },
    [dealer, finishRound],
  );

  const completeHand = useCallback(
    (updatedHands: PlayerHand[], completedIndex: number) => {
      const nextIndex = updatedHands.findIndex(
        (hand, index) => index > completedIndex && hand.status === "active",
      );
      setHands(updatedHands);
      if (nextIndex >= 0) {
        setActiveHand(nextIndex);
        setResultLabel(`Mano ${nextIndex + 1} de ${updatedHands.length}`);
      } else {
        void dealerTurn(updatedHands);
      }
    },
    [dealerTurn],
  );

  const hit = useCallback(() => {
    if (
      phaseRef.current !== "player" ||
      roundFinishedRef.current ||
      !shoeRef.current.length
    )
      return;
    const card = shoeRef.current.shift()!;
    const updatedHands = hands.map((hand, index) =>
      index === activeHand ? { ...hand, cards: [...hand.cards, card] } : hand,
    );
    const score = handValue(updatedHands[activeHand].cards);
    setFreshId(card.id);
    if (score >= 21) {
      updatedHands[activeHand].status = score > 21 ? "bust" : "stood";
      completeHand(updatedHands, activeHand);
    } else {
      setHands(updatedHands);
    }
  }, [activeHand, completeHand, hands]);

  const stand = useCallback(() => {
    if (phaseRef.current !== "player" || roundFinishedRef.current) return;
    const updatedHands = hands.map((hand, index) =>
      index === activeHand ? { ...hand, status: "stood" as HandStatus } : hand,
    );
    completeHand(updatedHands, activeHand);
  }, [activeHand, completeHand, hands]);

  const doubleDown = useCallback(() => {
    if (
      phaseRef.current !== "player" ||
      roundFinishedRef.current ||
      hands[activeHand]?.cards.length !== 2 ||
      !shoeRef.current.length
    )
      return;
    const card = shoeRef.current.shift()!;
    const updatedHands = hands.map((hand, index) =>
      index === activeHand
        ? {
            ...hand,
            cards: [...hand.cards, card],
            status:
              handValue([...hand.cards, card]) > 21
                ? ("bust" as HandStatus)
                : ("stood" as HandStatus),
          }
        : hand,
    );
    setFreshId(card.id);
    completeHand(updatedHands, activeHand);
  }, [activeHand, completeHand, hands]);

  const split = useCallback(() => {
    const current = hands[activeHand];
    if (
      phaseRef.current !== "player" ||
      roundFinishedRef.current ||
      hands.length !== 1 ||
      current?.cards.length !== 2 ||
      !shoeRef.current.length
    )
      return;
    const splitValue = (card: PlayingCard) =>
      card.rank === "A"
        ? 11
        : ["J", "Q", "K"].includes(card.rank)
          ? 10
          : Number(card.rank);
    if (splitValue(current.cards[0]) !== splitValue(current.cards[1])) return;
    const firstCard = shoeRef.current.shift()!;
    const secondCard = shoeRef.current.shift()!;
    const splitHands: PlayerHand[] = [
      {
        id: current.id,
        cards: [current.cards[0], firstCard],
        status: "active",
        fromSplit: true,
      },
      {
        id: ++handIdRef.current,
        cards: [current.cards[1], secondCard],
        status: "active",
        fromSplit: true,
      },
    ];
    setHands(splitHands);
    setActiveHand(0);
    setFreshId(secondCard.id);
    setResultLabel("Mano 1 de 2");
  }, [activeHand, hands]);

  const activeCards = hands[activeHand]?.cards ?? [];
  const canDouble = phase === "player" && activeCards.length === 2;
  const splitValue = (card: PlayingCard) =>
    card.rank === "A"
      ? 11
      : ["J", "Q", "K"].includes(card.rank)
        ? 10
        : Number(card.rank);
  const canSplit =
    phase === "player" &&
    hands.length === 1 &&
    activeCards.length === 2 &&
    splitValue(activeCards[0]) === splitValue(activeCards[1]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      const key = event.key.toLowerCase();
      if (phaseRef.current === "player" && key === "p") hit();
      if (phaseRef.current === "player" && key === "s") stand();
      if (phaseRef.current === "done" && key === "n") newRound();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [hit, newRound, stand]);

  return (
    <main className="game-page">
      <div className="game-toolbar">
        <div>
          <span className="live-dot" /> Partida en curso
        </div>
        <button onClick={() => setGameModal("leave")}>Abandonar partida</button>
      </div>
      <section className="table" aria-label="Mesa de Blackjack">
        <div className="hand-area">
          <div className="hand-label">
            <span>Banca</span>
            <strong>{phase === "player" ? "?" : handValue(dealer)}</strong>
          </div>
          <div className="cards-row">
            {dealer.map((card, index) => (
              <PlayingCardView
                key={card.id}
                card={card}
                hidden={index === 1 && phase === "player"}
                fresh={freshId === card.id}
              />
            ))}
          </div>
        </div>
        <div className="table-message">
          <span
            className={`status-message ${
              roundResult ? `status-message--${roundResult}` : ""
            }`}
          >
            {resultLabel}
          </span>
          <p>
            {phase === "player"
              ? "Pide una carta o plántate"
              : phase === "dealer"
                ? "La banca está jugando…"
                : "Ronda finalizada"}
          </p>
        </div>
        <div className="hand-area hand-area--player">
          <div className="player-hands">
            {hands.map((hand, handIndex) => (
              <div
                className={`split-hand ${
                  handIndex === activeHand && phase === "player"
                    ? "split-hand--active"
                    : ""
                }`}
                key={hand.id}
              >
                {hands.length > 1 && (
                  <span className="split-hand__label">
                    Mano {handIndex + 1}
                  </span>
                )}
                <div className="cards-row">
                  {hand.cards.map((card) => (
                    <PlayingCardView
                      key={card.id}
                      card={card}
                      fresh={freshId === card.id}
                    />
                  ))}
                </div>
                {hand.status === "bust" && (
                  <span className="split-hand__bust">Te has pasado</span>
                )}
              </div>
            ))}
          </div>
          <div className="hand-label">
            <span>Tu mano</span>
            <strong>{activeCards.length ? handValue(activeCards) : 0}</strong>
          </div>
        </div>
      </section>
      <div className="game-actions">
        {phase !== "done" ? (
          <>
            <Button
              variant="secondary"
              disabled={phase !== "player"}
              onClick={stand}
            >
              Plantarse <kbd>S</kbd>
            </Button>
            <Button
              variant="secondary"
              disabled={!canDouble}
              onClick={doubleDown}
            >
              Doblar
            </Button>
            <Button variant="secondary" disabled={!canSplit} onClick={split}>
              Dividir
            </Button>
            <Button disabled={phase !== "player"} onClick={hit}>
              Pedir carta <kbd>P</kbd>
            </Button>
          </>
        ) : (
          <Button onClick={newRound}>
            Nueva partida <kbd>N</kbd>
          </Button>
        )}
      </div>
      {gameModal === "leave" && (
        <Modal
          title="¿Seguro que quieres salir?"
          onClose={() => setGameModal(null)}
          actions={
            <>
              <Button variant="secondary" onClick={() => setGameModal(null)}>
                Seguir jugando
              </Button>
              <Button variant="danger" onClick={() => navigate("home")}>
                Salir de la partida
              </Button>
            </>
          }
        >
          <p>La ronda actual se perderá y no podrás recuperarla.</p>
        </Modal>
      )}
      {gameModal === "result" && (
        <Modal
          title={
            roundResult === "win"
              ? "¡Has ganado!"
              : roundResult === "loss"
                ? "Esta vez gana la banca"
                : "Empate"
          }
          onClose={() => setGameModal(null)}
          actions={
            <>
              <Button variant="secondary" onClick={() => navigate("home")}>
                Volver al inicio
              </Button>
              <Button onClick={newRound}>Nueva partida</Button>
            </>
          }
        >
          <div
            className={`result-icon result-icon--${roundResult}`}
            aria-hidden="true"
          >
            {roundResult === "win" ? "21" : roundResult === "loss" ? "♠" : "="}
          </div>
          {handResults.length > 1 && (
            <p className="hand-summary">
              {handResults
                .map(
                  (result, index) =>
                    `Mano ${index + 1}: ${
                      result === "win"
                        ? "victoria"
                        : result === "loss"
                          ? "derrota"
                          : "empate"
                    }`,
                )
                .join(" · ")}
            </p>
          )}
          <p>
            {roundResult === "win"
              ? "Una mano impecable. Has superado a la banca."
              : roundResult === "loss"
                ? "Buena partida. La próxima mano puede ser la tuya."
                : "Misma puntuación. La ronda queda en tablas."}
          </p>
        </Modal>
      )}
    </main>
  );
}

function StyleGuide() {
  return (
    <main className="page-shell style-guide">
      <div className="style-heading">
        <p className="eyebrow">Sistema de diseño</p>
        <h1>Guía de estilos</h1>
        <p>Fundamentos y componentes de la experiencia Veintiuno.</p>
      </div>
      <section>
        <h2>Paleta de color</h2>
        <div className="swatches">
          {[
            ["Fieltro", "var(--color-felt)"],
            ["Oro", "var(--color-gold)"],
            ["Noche", "var(--color-night)"],
            ["Marfil", "var(--color-ivory)"],
            ["Victoria", "var(--color-success)"],
            ["Derrota", "var(--color-danger)"],
          ].map(([name, color]) => (
            <div className="swatch" key={name}>
              <span style={{ background: color }} />
              <strong>{name}</strong>
              <code>{color}</code>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2>Tipografía</h2>
        <div className="type-samples">
          <h1>Título principal</h1>
          <h2>Título de sección</h2>
          <h3>Título de tarjeta</h3>
          <p>Texto de párrafo para contenidos y descripciones.</p>
          <button className="button button--primary">Texto de botón</button>
        </div>
      </section>
      <section>
        <h2>Botones</h2>
        <div className="component-row">
          <Button>Primario</Button>
          <Button variant="secondary">Secundario</Button>
          <Button disabled>Deshabilitado</Button>
        </div>
      </section>
      <section>
        <h2>Campos de formulario</h2>
        <div className="style-fields">
          <Field
            label="Estado normal"
            id="normal"
            value=""
            onChange={() => {}}
            placeholder="Escribe aquí"
          />
          <Field
            label="Estado de error"
            id="error"
            value="dato"
            onChange={() => {}}
            message="Revisa este campo."
          />
          <Field
            label="Estado correcto"
            id="success"
            value="correcto"
            onChange={() => {}}
            message="El campo es válido."
            valid
          />
        </div>
      </section>
      <section>
        <h2>Cartas y estados</h2>
        <div className="component-row">
          <PlayingCardView card={{ id: "s-a", rank: "A", suit: "spades" }} />
          <PlayingCardView card={{ id: "s-q", rank: "Q", suit: "hearts" }} />
          <span className="badge badge--win">
            <i />
            Victoria
          </span>
          <span className="badge badge--loss">
            <i />
            Derrota
          </span>
          <span className="badge badge--draw">
            <i />
            Empate
          </span>
        </div>
      </section>
      <section>
        <h2>Espaciado, radios y sombras</h2>
        <p>
          Escala base de 8 px: 8, 16, 24, 32, 48, 64 y 96. Radios: 6, 12, 20 y
          redondo. Sombras: baja, media y elevada.
        </p>
      </section>
    </main>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [modal, setModal] = useState<ModalName>(null);
  const [sessionMatches, setSessionMatches] = useState<RoundResult[]>([]);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [partidas, setPartidas] = useState<MatchRecord[]>([]);

  // Al abrir la web, si hay un token guardado, recupera la sesión
  useEffect(() => {
    if (!hayToken()) return;
    obtenerYo()
      .then(setUsuario)
      .catch(() => cerrarSesion());
  }, []);

  // Cuando cambia el usuario, carga SUS partidas
  useEffect(() => {
    if (!usuario) {
      setPartidas([]);
      return;
    }
    obtenerPartidas()
      .then(setPartidas)
      .catch(() => setPartidas([]));
  }, [usuario]);

  const logout = () => {
    cerrarSesion();
    setUsuario(null);
    navigate("home");
  };

  useEffect(() => {
    const update = () => setPage(pageFromHash());
    window.addEventListener("hashchange", update);
    if (!window.location.hash) navigate("home");
    return () => window.removeEventListener("hashchange", update);
  }, []);

  const recordResult = useCallback(
    (ronda: RondaTerminada) => {
      setSessionMatches((previous) => [...previous, ronda.result]);
      if (usuario) {
        guardarPartida(ronda)
          .then(() => obtenerPartidas().then(setPartidas))
          .catch(console.error);
      }
    },
    [usuario],
  );

  const showChrome = !["login", "register"].includes(page);
  return (
    <div className="app">
      {showChrome && (
        <Header
          usuario={usuario}
          onLogout={logout}
          onRules={() => setModal("rules")}
        />
      )}
      {page === "home" && (
        <HomePage
          sessionMatches={sessionMatches}
          partidas={partidas}
          usuario={usuario}
        />
      )}
      {page === "login" && <LoginPage onAuth={setUsuario} />}
      {page === "register" && <RegisterPage onAuth={setUsuario} />}
      {page === "game" && <GamePage onResult={recordResult} />}
      {page === "style" && <StyleGuide />}
      {showChrome && page !== "game" && <Footer />}
      {modal === "rules" && <RulesModal onClose={() => setModal(null)} />}
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { createCourse } from "./actions";

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("es-CA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(n: number) {
  return `$${(n ?? 0).toLocaleString("es-CA")}`;
}

const STATUS_CFG: Record<string, { bg: string; color: string }> = {
  inscrito:   { bg: "#f8f1fc", color: "#7a6585" },
  confirmado: { bg: "#d5f1fa", color: "#1a7fa0" },
  pagado:     { bg: "#dcfce7", color: "#166534" },
  cancelado:  { bg: "#fee2e2", color: "#991b1b" },
  activo:     { bg: "#fef0d0", color: "#b07010" },
};

export default async function CursosPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("courses")
    .select("*")
    .order("course_date", { ascending: false });

  type CourseRow = NonNullable<typeof rows>[number];

  // Group by name + date + location
  const courseMap = new Map<string, CourseRow[]>();
  for (const r of rows ?? []) {
    const key = `${r.course_date}__${r.course_name}__${r.location ?? ""}`;
    if (!courseMap.has(key)) courseMap.set(key, []);
    courseMap.get(key)!.push(r);
  }

  const courseGroups = Array.from(courseMap.entries())
    .map(([key, allRows]) => {
      // Shell rows are those with no student_name (created via "Agregar curso")
      const inscritos = allRows.filter((r) => r.student_name);
      const first = allRows[0];
      return {
        key,
        date: first.course_date as string | null,
        name: first.course_name as string | null,
        location: first.location as string | null,
        inscritos,
        total: inscritos.reduce((s, i) => s + (i.amount ?? 0), 0),
      };
    })
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-4xl leading-none"
            style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
          >
            Cursos
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {courseGroups.length} curso{courseGroups.length !== 1 ? "s" : ""} registrado{courseGroups.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Formulario nuevo curso */}
      <details
        className="overflow-hidden rounded-2xl border"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}
      >
        <summary
          className="px-5 py-4 cursor-pointer text-sm font-semibold select-none flex items-center gap-2"
          style={{ color: "var(--ink)", fontFamily: "var(--font-sans)" }}
        >
          <span
            className="w-5 h-5 flex items-center justify-center rounded-full text-white text-xs"
            style={{ background: "var(--rose)" }}
          >+</span>
          Agregar curso
        </summary>
        <form
          action={createCourse}
          className="px-5 pb-5 pt-4 grid grid-cols-3 gap-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div>
            <label className="field-label">Nombre del curso</label>
            <input name="course_name" type="text" required className="field" placeholder="Tortas de fondant" />
          </div>
          <div>
            <label className="field-label">Fecha</label>
            <input name="course_date" type="date" required className="field" />
          </div>
          <div>
            <label className="field-label">Lugar</label>
            <input name="location" type="text" className="field" placeholder="Montréal" />
          </div>
          <div className="col-span-3">
            <button type="submit" className="btn-primary">
              Crear curso
            </button>
          </div>
        </form>
      </details>

      {/* Lista de cursos */}
      {courseGroups.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>Sin cursos registrados.</p>
      ) : (
        courseGroups.map((group) => (
          <div
            key={group.key}
            className="overflow-hidden rounded-2xl border"
            style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}
          >
            {/* Course header */}
            <div
              className="px-5 py-4 border-b flex items-center justify-between gap-4 flex-wrap"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <div className="flex items-center gap-3 flex-wrap min-w-0">
                <h2
                  className="text-xl leading-none"
                  style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
                >
                  {group.name ?? "Curso"}
                </h2>
                {/* Date chip */}
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ background: "var(--rose-light)", color: "var(--rose)" }}
                >
                  <i className="fa-solid fa-calendar-day" style={{ fontSize: 10 }} />
                  {formatDate(group.date)}
                </span>
                {/* Location chip */}
                {group.location && (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: "var(--blue-light)", color: "#1a7fa0" }}
                  >
                    <i className="fa-solid fa-location-dot" style={{ fontSize: 10 }} />
                    {group.location}
                  </span>
                )}
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {group.inscritos.length} inscrito{group.inscritos.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p
                className="text-2xl shrink-0"
                style={{ fontFamily: "var(--font-display)", color: "var(--rose)" }}
              >
                {formatMoney(group.total)}
              </p>
            </div>

            {/* Inscritos table */}
            {group.inscritos.length === 0 ? (
              <div className="px-5 py-6 flex items-center gap-2" style={{ color: "var(--muted)" }}>
                <i className="fa-brands fa-shopify" style={{ fontSize: 16, color: "#96bf48" }} />
                <p className="text-sm">Sin inscritos aún — se sincronizarán vía Shopify.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left" style={{ borderColor: "var(--border)" }}>
                    {["Estudiante", "Email", "Teléfono", "Monto", "Estado"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-[11px] uppercase tracking-widest font-semibold"
                        style={{ color: "var(--muted)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.inscritos.map((i) => (
                    <tr key={i.id} className="table-row-hover border-b" style={{ borderColor: "var(--border)" }}>
                      <td className="px-4 py-3 font-semibold" style={{ color: "var(--ink)" }}>
                        {i.student_name}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{i.email ?? "—"}</td>
                      <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{i.phone ?? "—"}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "var(--ink)" }}>
                        {formatMoney(i.amount ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize"
                          style={{
                            background: STATUS_CFG[i.status ?? "inscrito"]?.bg ?? "#f8f1fc",
                            color:      STATUS_CFG[i.status ?? "inscrito"]?.color ?? "#7a6585",
                          }}
                        >
                          {i.status ?? "inscrito"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))
      )}
    </div>
  );
}

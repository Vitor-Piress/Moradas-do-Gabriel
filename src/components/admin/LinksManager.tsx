import {
  ArrowDown,
  ArrowUp,
  Check,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  MousePointerClick,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import type { LinkRow } from "../../@types/database.types";
import { useLinkMutations } from "../../hooks/usePortalData";
import { AVAILABLE_LINK_ICONS, resolveLinkIcon } from "../../utils/iconMapper";

interface LinksManagerProps {
  links: LinkRow[];
  isLoading: boolean;
  clicksByLinkId: Record<string, number>;
}

export function LinksManager({
  links,
  isLoading,
  clicksByLinkId,
}: LinksManagerProps) {
  const { createMutation, updateMutation, deleteMutation, reorderMutation } =
    useLinkMutations();

  // Estado do formulário de criação
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("whatsapp");
  const [isActive, setIsActive] = useState(true);

  // Estado de edição inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editIcon, setEditIcon] = useState("link");
  const [feedback, setFeedback] = useState<string | null>(null);

  const showTempFeedback = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 3000);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    await createMutation.mutateAsync({
      title: title.trim(),
      url: url.trim(),
      icon,
      is_active: isActive,
      position: links.length + 1,
    });

    setTitle("");
    setUrl("");
    setIcon("whatsapp");
    setIsActive(true);
    showTempFeedback("Novo botão adicionado com sucesso!");
  };

  const startEditing = (link: LinkRow) => {
    setEditingId(link.id);
    setEditTitle(link.title);
    setEditUrl(link.url);
    setEditIcon(link.icon || "link");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
    setEditUrl("");
  };

  const saveEditing = async (id: string) => {
    if (!editTitle.trim() || !editUrl.trim()) return;
    await updateMutation.mutateAsync({
      id,
      updates: {
        title: editTitle.trim(),
        url: editUrl.trim(),
        icon: editIcon,
      },
    });
    setEditingId(null);
    showTempFeedback("Link atualizado!");
  };

  const handleToggleActive = async (link: LinkRow) => {
    await updateMutation.mutateAsync({
      id: link.id,
      updates: {
        is_active: !link.is_active,
      },
    });
  };

  const handleDelete = async (link: LinkRow) => {
    const confirmed = window.confirm(
      `Deseja realmente excluir o link "${link.title}"?`,
    );
    if (!confirmed) return;

    await deleteMutation.mutateAsync(link.id);
    showTempFeedback("Link removido.");
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= links.length) return;

    const reordered = [...links];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const payload = reordered.map((item, idx) => ({
      id: item.id,
      position: idx + 1,
    }));

    await reorderMutation.mutateAsync(payload);
    showTempFeedback("Ordem dos links atualizada!");
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {feedback && (
        <div className="rounded-xl bg-white border border-slate-200 px-4 py-3 text-xs sm:text-sm font-semibold text-brand-navy flex items-center justify-between gap-2 shadow-xs">
          <span className="min-w-0 flex-1 break-words">✓ {feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-brand-navy/60 hover:text-brand-navy shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Card: Adicionar Novo Link */}
      <section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-brand-navy text-white flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-brand-navy break-words">
              Adicionar Novo Botão / Link
            </h3>
            <p className="text-xs text-brand-navy/65 break-words">
              Os links ativos aparecem na aba &ldquo;Links &amp; Contatos&rdquo;
              da página pública
            </p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
                Título do Botão *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Reservar pelo WhatsApp"
                className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
                URL de Destino *
              </label>
              <input
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://wa.me/55..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
                Ícone do Botão
              </label>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
              >
                {AVAILABLE_LINK_ICONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between sm:justify-end gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-brand-navy cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-brand-navy rounded shrink-0"
                />
                <span>Publicar ativo imediatamente</span>
              </label>

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-navy hover:bg-brand-navy-light text-white font-semibold text-xs sm:text-sm transition-colors disabled:opacity-50 shrink-0"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <Plus className="w-4 h-4 shrink-0" />
                )}
                <span>Criar Link</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Lista e Reordenação de Links */}
      <section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-brand-navy">
              Links Cadastrados ({links.length})
            </h3>
            <p className="text-xs text-brand-navy/65">
              Use as setas para alterar a ordem de exibição (position)
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-slate-100 animate-pulse"
              />
            ))}
          </div>
        ) : links.length === 0 ? (
          <div className="rounded-xl bg-brand-bg border border-slate-200 p-6 text-center">
            <p className="text-sm font-medium text-brand-navy/75">
              Nenhum link cadastrado ainda. Utilize o formulário acima para
              criar o primeiro botão.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link, index) => {
              const IconComp = resolveLinkIcon(link.icon, link.title, link.url);
              const isEditing = editingId === link.id;
              const clicks = clicksByLinkId[link.id] ?? 0;

              return (
                <div
                  key={link.id}
                  className={`rounded-xl border p-3.5 sm:p-4 transition-colors ${
                    link.is_active
                      ? "bg-brand-bg border-slate-200"
                      : "bg-brand-bg/50 border-slate-200 opacity-65"
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Título"
                          className="w-full min-w-0 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
                        />
                        <input
                          type="text"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          placeholder="URL"
                          className="w-full min-w-0 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
                        />
                        <select
                          value={editIcon}
                          onChange={(e) => setEditIcon(e.target.value)}
                          className="w-full min-w-0 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
                        >
                          {AVAILABLE_LINK_ICONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-brand-navy hover:bg-slate-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEditing(link.id)}
                          disabled={updateMutation.isPending}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-brand-navy text-white text-xs font-semibold hover:bg-brand-navy-light"
                        >
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>Salvar</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        {/* Botões de Reordenação (position) */}
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMove(index, "up")}
                            disabled={index === 0 || reorderMutation.isPending}
                            title="Mover para cima"
                            className="p-1 rounded-lg bg-white border border-slate-200 text-brand-navy hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(index, "down")}
                            disabled={
                              index === links.length - 1 ||
                              reorderMutation.isPending
                            }
                            title="Mover para baixo"
                            className="p-1 rounded-lg bg-white border border-slate-200 text-brand-navy hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
                          <IconComp className="w-5 h-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-brand-navy">
                              #{index + 1}
                            </span>
                            <h4 className="font-bold text-sm sm:text-base text-brand-navy break-words">
                              {link.title}
                            </h4>
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                                link.is_active
                                  ? "bg-brand-green/40 border-slate-200 text-brand-navy"
                                  : "bg-white border-slate-200 text-brand-navy/70"
                              }`}
                            >
                              {link.is_active ? "Ativo" : "Inativo"}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-brand-navy">
                              <MousePointerClick className="w-3 h-3 shrink-0" />
                              <span>{clicks} cliques</span>
                            </span>
                          </div>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs text-brand-navy/65 hover:text-brand-navy max-w-full min-w-0"
                          >
                            <span className="break-all line-clamp-1">
                              {link.url}
                            </span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      </div>

                      {/* Ações do Link (empilhadas e ajustadas no mobile) */}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-200 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(link)}
                          title={
                            link.is_active ? "Desativar link" : "Ativar link"
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-brand-navy hover:bg-slate-50 transition-colors"
                        >
                          {link.is_active ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 shrink-0" />
                              <span>Ocultar</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 shrink-0" />
                              <span>Ativar</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => startEditing(link)}
                          title="Editar link"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-brand-navy hover:bg-slate-50 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 shrink-0" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(link)}
                          title="Excluir link"
                          className="p-2 rounded-xl bg-white border border-slate-200 text-brand-navy/75 hover:bg-slate-50 hover:text-brand-navy transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FolderPlus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/useAuth";
import {
  useCreateDiagram,
  useCreateFolder,
  useDeleteDiagram,
  useDiagramList,
} from "@/features/diagrams";
import { cn } from "@/lib/utils";

export default function DiagramsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [folderId, setFolderId] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState("");

  const listQuery = useDiagramList(folderId, user?.id);
  const createMutation = useCreateDiagram(user?.id);
  const deleteMutation = useDeleteDiagram(user?.id);
  const folderMutation = useCreateFolder(user?.id);

  const orgId = listQuery.data?.pages[0]?.orgId ?? null;
  const diagrams = listQuery.data?.pages.flatMap((p) => p.diagrams) ?? [];
  const folders = listQuery.data?.pages[0]?.folders ?? [];
  const loading = listQuery.isLoading;
  const error = listQuery.error instanceof Error ? listQuery.error.message : null;
  const hasMore = listQuery.hasNextPage;

  const createDiagram = async () => {
    try {
      const { diagram } = await createMutation.mutateAsync({
        title: "Untitled Diagram",
        folderId,
      });
      navigate(`/diagrams/${diagram.id}`);
    } catch (e: unknown) {
      /* error surfaced via mutation; list query stays */
      void e;
    }
  };

  const createFolder = async () => {
    if (!newFolder.trim()) return;
    await folderMutation.mutateAsync(newFolder.trim());
    setNewFolder("");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this diagram?")) return;
    await deleteMutation.mutateAsync(id);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f7f9fc]">
      <header className="flex items-center justify-between border-b border-[#e2e8f0] bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#0f172a]">Diagrams</h1>
          <p className="text-sm text-[#64748b]">Create flowcharts, UML, and architecture maps.</p>
        </div>
        <Button
          onClick={() => void createDiagram()}
          disabled={createMutation.isPending || !orgId && listQuery.isFetching}
          className="rounded-lg"
        >
          {createMutation.isPending ? <Spinner className="size-4" /> : <Plus className="size-4" />}
          New diagram
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 border-r border-[#e2e8f0] bg-white p-3">
          <button
            type="button"
            onClick={() => setFolderId(null)}
            className={cn(
              "mb-1 w-full rounded-md px-2 py-1.5 text-left text-sm",
              folderId === null ? "bg-[#eff6ff] font-medium text-[#1d4ed8]" : "hover:bg-[#f1f5f9]"
            )}
          >
            All diagrams
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFolderId(f.id)}
              className={cn(
                "mb-1 w-full rounded-md px-2 py-1.5 text-left text-sm",
                folderId === f.id ? "bg-[#eff6ff] font-medium text-[#1d4ed8]" : "hover:bg-[#f1f5f9]"
              )}
            >
              {f.name}
            </button>
          ))}
          <div className="mt-3 flex gap-1">
            <Input
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              placeholder="New folder"
              className="h-8 rounded-md text-xs"
            />
            <Button type="button" size="icon-sm" variant="outline" onClick={() => void createFolder()}>
              <FolderPlus className="size-3.5" />
            </Button>
          </div>
        </aside>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex justify-center py-20">
              <Spinner className="size-6" />
            </div>
          )}
          {(error || createMutation.error) && (
            <p className="mb-4 text-sm text-destructive">
              {error ||
                (createMutation.error instanceof Error
                  ? createMutation.error.message
                  : "Could not create diagram")}
            </p>
          )}
          {!loading && diagrams.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#cbd5e1] bg-white px-6 py-16 text-center">
              <p className="text-sm text-[#64748b]">No diagrams yet.</p>
              <Button className="mt-4 rounded-lg" onClick={() => void createDiagram()}>
                Create your first diagram
              </Button>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {diagrams.map((d) => (
              <div
                key={d.id}
                className="group relative rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm transition hover:border-[#93c5fd] hover:shadow-md"
              >
                <Link to={`/diagrams/${d.id}`} className="block">
                  <div className="mb-3 flex h-28 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#eef2ff,#f8fafc)] text-[#94a3b8]">
                    <span className="text-xs">Open editor</span>
                  </div>
                  <h2 className="truncate text-sm font-medium text-[#0f172a]">{d.title}</h2>
                  <p className="mt-1 text-[11px] text-[#94a3b8]">
                    Updated {new Date(d.updatedAt).toLocaleString()} · v{d.currentVersion}
                  </p>
                </Link>
                <button
                  type="button"
                  className="absolute right-2 top-2 rounded p-1 text-[#94a3b8] opacity-0 hover:bg-[#fee2e2] hover:text-[#b91c1c] group-hover:opacity-100"
                  onClick={() => void remove(d.id)}
                  title="Delete"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
          {hasMore ? (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                className="rounded-lg"
                disabled={listQuery.isFetchingNextPage}
                onClick={() => void listQuery.fetchNextPage()}
              >
                {listQuery.isFetchingNextPage ? <Spinner className="size-4" /> : "Load more"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

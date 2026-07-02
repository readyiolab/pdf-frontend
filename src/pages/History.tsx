import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { type Job } from "../services/api";
import { S3_BASE_URL, getToolById, formatFilenameFromKey } from "@/lib/design-tokens";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Download, AlertCircle, Clock, CheckCircle2, ChevronRight, ChevronLeft, RefreshCw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const History: React.FC = () => {
  const { user, refreshProfile, loading } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const jobsPerPage = 10;

  useEffect(() => {
    if (user?.jobs) {
      // Sort jobs by creation date descending
      const sortedJobs = [...user.jobs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setJobs(sortedJobs);
    }
  }, [user]);

  // Set up polling if there are any processing/queued jobs
  useEffect(() => {
    const hasActiveJobs = jobs.some(j => j.status === "QUEUED" || j.status === "PROCESSING");
    
    if (hasActiveJobs) {
      const interval = setInterval(() => {
        refreshProfile();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [jobs, refreshProfile]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setTimeout(() => setIsRefreshing(false), 500); // UI feedback
  };

  const handleDownload = (outputFile: string) => {
    const link = document.createElement("a");
    link.href = `${S3_BASE_URL}/${outputFile}`;
    link.target = "_blank";
    link.download = formatFilenameFromKey(outputFile);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">Loading history...</p>
        </div>
      </div>
    );
  }

  if (!user || jobs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-8">Activity History</h1>
        <div className="rounded-3xl border bg-card/50 shadow-sm p-4">
          <EmptyState
            title="No activity yet"
            description="Your processed documents will appear here. Start using our tools to see your history."
            action={{
              label: "Explore Tools",
              onClick: () => window.location.href = "/workspace"
            }}
          />
        </div>
      </div>
    );
  }

  // Pagination logic
  const totalPages = Math.ceil(jobs.length / jobsPerPage);
  const paginatedJobs = jobs.slice(
    (currentPage - 1) * jobsPerPage,
    currentPage * jobsPerPage
  );

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Activity History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and download your recently processed files. Files are kept for 1 hour.
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 rounded-xl bg-card border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider w-1/4">Tool</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider w-1/4">Date</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider w-1/4">Status</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider text-right w-1/4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedJobs.map((job, index) => {
                const toolConfig = getToolById(job.tool);
                const Icon = toolConfig?.icon || Clock;
                const isExpired = new Date(job.expiresAt) < new Date();
                const canDownload = job.status === "COMPLETED" && job.outputFile && !isExpired;

                return (
                  <tr key={job.id} className="group hover:bg-muted/30 transition-colors animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0",
                          toolConfig?.accent || "bg-muted"
                        )}>
                          <Icon className={cn("h-4.5 w-4.5", toolConfig?.accentText || "text-muted-foreground")} />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{toolConfig?.name || job.tool}</p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5" title={job.id}>
                            #{job.id.substring(job.id.length - 8)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{new Date(job.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-6 py-4">
                      {job.status === "COMPLETED" ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Success
                        </div>
                      ) : job.status === "FAILED" ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive">
                          <XCircle className="h-3.5 w-3.5" />
                          Failed
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                          <Spinner className="h-3 w-3" />
                          Processing
                        </div>
                      )}
                      
                      {job.status === "FAILED" && job.errorMessage && (
                        <p className="text-[10px] text-destructive mt-1.5 max-w-[200px] truncate" title={job.errorMessage}>
                          {job.errorMessage}
                        </p>
                      )}
                      {canDownload && (
                        <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expires in {Math.max(0, Math.round((new Date(job.expiresAt).getTime() - Date.now()) / 60000))}m
                        </p>
                      )}
                      {isExpired && job.status === "COMPLETED" && (
                        <p className="text-[10px] text-destructive mt-1.5 flex items-center gap-1 font-semibold">
                          <AlertCircle className="h-3 w-3" />
                          Expired
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => canDownload ? handleDownload(job.outputFile!) : null}
                        disabled={!canDownload}
                        className={cn(
                          "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm",
                          canDownload
                            ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                            : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-6">
          <p className="text-sm text-muted-foreground font-medium">
            Showing <span className="text-foreground font-bold">{(currentPage - 1) * jobsPerPage + 1}</span> to <span className="text-foreground font-bold">{Math.min(currentPage * jobsPerPage, jobs.length)}</span> of <span className="text-foreground font-bold">{jobs.length}</span> entries
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default History;

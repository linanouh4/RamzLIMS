import { supabase } from "@/lib/supabase";

export async function sampleLabels<T extends Record<string, any>>(rows: T[]) {
  const projects = new Map<number, { project_name: string; client_id: number }>();
  const clients = new Map<number, string>();
  const projectIds = [...new Set(rows.map(row => Number(row.project_id)).filter(Boolean))];
  for (let i = 0; i < projectIds.length; i += 100) {
    const { data, error } = await supabase.from("projects").select("id, project_name, client_id").in("id", projectIds.slice(i, i + 100));
    if (error) throw error;
    for (const project of data) projects.set(project.id, project);
  }
  const clientIds = [...new Set(rows.map(row => Number(row.client_id || projects.get(Number(row.project_id))?.client_id)).filter(Boolean))];
  for (let i = 0; i < clientIds.length; i += 100) {
    const { data, error } = await supabase.from("clients").select("id, client_name").in("id", clientIds.slice(i, i + 100));
    if (error) throw error;
    for (const client of data) clients.set(client.id, client.client_name);
  }
  return rows.map(row => {
    const project = projects.get(Number(row.project_id));
    return { ...row, project_name: project?.project_name, client_name: clients.get(Number(row.client_id || project?.client_id)) };
  });
}

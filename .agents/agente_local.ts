// Agente Responsable Autogenerado para el Proyecto
import { ejecutarAgenteDeveloper } from '/Users/luisenrique/Documents/github/ingjuego/ing-develop-agent/arquitecto-agente/piso2_operaciones_produccion/agente_developer';

export async function ejecutar(prompt: string, pathProyecto: string) {
    // Delega al supervisor agente_developer.ts
    return ejecutarAgenteDeveloper(prompt, pathProyecto);
}

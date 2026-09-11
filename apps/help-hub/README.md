# HelpHub

Frontend operacional do Jornada para atendimento e configuracao de suporte. O QuickForms evoluira para um app proprio; enquanto isso, os fluxos de configuracao que ainda o integram permanecem aqui.

Base atual:

- `Vite`
- `React`
- `React Router`
- `React Aria Components`
- `Tailwind CSS`
- `vite-plugin-pwa`

Build:

- o roteador usa lazy routes para telas operacionais
- `vite.config.ts` separa vendors grandes em chunks nomeados
- o objetivo e manter o entrypoint do HelpHub pequeno sem acoplar o colaborador ao workspace operacional

Configuracao local:

- copiar `apps/help-hub/.env.example`
- ajustar `VITE_API_BASE_URL` quando a API nao estiver em `http://localhost:3004/api`
- ajustar `VITE_REALTIME_BASE_URL` quando o realtime nao estiver em `http://localhost:3004`

Comandos:

```bash
npm run dev:help-hub
npm run test:help-hub
npm run build:help-hub
```

URL local padrao:

```text
http://localhost:3007
```

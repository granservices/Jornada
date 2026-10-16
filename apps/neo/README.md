# Neo

Frontend e PWA unificados do Neo, com os modulos Jornada, Tickets e QuickForms.

Base atual:

- `Vite`
- `React`
- `React Router`
- `React Aria Components`
- `Tailwind CSS`
- `vite-plugin-pwa`

Primeiras entregas visuais:

- shell de `auth`
- login
- cadastro
- recuperar senha
- redefinir senha
- area logada inicial com programacao, vencimentos e comunicados

Status em 21 de agosto de 2026:

- login conectado ao backend real de `apps/api`
- sessao persistida no navegador
- rota `/app` protegida para uso de admin bootstrap e futuros usuarios reais

Configuracao local:

- copiar `apps/neo/.env.example`
- ajustar `VITE_API_BASE_URL` quando a API nao estiver em `http://localhost:3004/api`

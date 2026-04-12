# Gastô

App de finanças pessoais para Android com registro de despesas por voz ou texto, categorização automática offline e relatórios mensais.

## Funcionalidades

- **Registro por voz** — fala "uber vinte reais" e o app categoriza e extrai o valor
- **Registro por texto** — digita em linguagem natural, mesmo resultado
- **Classificação offline** — TF-IDF + LinearSVC rodando no próprio celular (sem internet)
- **Transcrição por voz** — Whisper (OpenAI) rodando localmente via backend Python
- **Entradas e despesas** — controle de receitas separado dos gastos
- **Despesas recorrentes** — lançamentos que se repetem todo mês automaticamente
- **Orçamento por categoria** — define limites e recebe alerta ao ultrapassar
- **Meta de economia** — acompanha quanto sobrou do mês vs. a meta definida
- **Relatórios mensais** — gráfico de pizza, gastos por dia, maiores despesas, saldo
- **Navegação entre meses** — histórico completo de qualquer mês
- **Exportar CSV** — compartilha os dados do mês em planilha
- **Modo escuro** — segue o tema do sistema automaticamente
- **Banco local** — todos os dados ficam no celular (SQLite), sem servidor de dados

---

## Estrutura do projeto

```
financa/
├── app/                  # React Native (Expo)
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── index.tsx       # Aba Despesas
│   │   │   ├── income.tsx      # Aba Entradas
│   │   │   └── reports.tsx     # Aba Relatórios
│   │   ├── confirm.tsx         # Confirmação de nova despesa
│   │   ├── edit.tsx            # Edição de despesa
│   │   ├── add-entrada.tsx     # Nova entrada de receita
│   │   └── budget.tsx          # Orçamentos por categoria
│   ├── components/
│   │   └── ExpenseItem.tsx     # Card de despesa com swipe
│   ├── lib/
│   │   ├── db.ts               # SQLite (expo-sqlite)
│   │   ├── api.ts              # Comunicação com backend
│   │   ├── classifier.ts       # Classificador offline (TF-IDF + LinearSVC)
│   │   ├── theme.ts            # Modo claro / escuro
│   │   └── types.ts            # Tipos TypeScript
│   ├── constants/
│   │   ├── categories.ts       # Categorias de despesa
│   │   └── incomeCategories.ts # Categorias de entrada
│   └── assets/
│       └── model.json          # Modelo exportado (gerado por export_model.py)
│
├── backend/              # Python / FastAPI
│   ├── main.py                 # Servidor (transcrição de áudio)
│   ├── classifier.py           # Wrapper do modelo sklearn
│   └── requirements.txt
│
└── model/                # Treinamento do classificador
    ├── train.py                # Treina TF-IDF + LinearSVC
    ├── export_model.py         # Exporta modelo para JSON (app/assets/model.json)
    ├── generate_dataset.py     # Gera dataset sintético
    └── data/
        ├── dataset.csv         # Dataset de treino
        └── modelo.pkl          # Modelo treinado (gerado por train.py)
```

---

## Pré-requisitos

- Node.js 18+
- Python 3.11+ (para o backend de voz)
- [Expo Go](https://expo.dev/go) no celular (ou Android Studio para emulador)
- ffmpeg instalado no sistema (para o Whisper transcrever áudio)

---

## Setup

### 1. App (React Native)

```bash
cd app
npm install
npx expo start --android
```

Escaneie o QR code com o Expo Go ou pressione `a` para abrir no emulador.

### 2. Backend de voz (opcional — só necessário para gravação de voz)

```bash
cd backend
pip install -r requirements.txt
pip install openai-whisper
uvicorn main:app --host 0.0.0.0 --port 8000
```

Edite `app/lib/api.ts` e troque o IP pelo IP da sua máquina na rede local:

```ts
export const API_URL = "http://SEU_IP:8000";
```

### 3. Re-treinar o classificador (opcional)

```bash
cd model
pip install -r requirements.txt

# Treina o modelo
python train.py

# Exporta para o app
python export_model.py
```

O arquivo `app/assets/model.json` será gerado automaticamente.

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| App | React Native + Expo SDK 54 |
| Navegação | Expo Router v3 |
| Banco de dados | SQLite via expo-sqlite |
| Classificador | TF-IDF + LinearSVC (sklearn → JSON → TypeScript) |
| Transcrição de voz | OpenAI Whisper "small" |
| Backend | FastAPI + Python |
| Gráficos | react-native-svg |

---

## GitHub Pages

O site da aplicação está disponível em:

- https://jeffev.github.io/gasto/

> Para publicar corretamente, mantenha o conteúdo do site em `docs/` e deixe o GitHub Pages apontado para essa pasta.

## Download do APK

Baixe o APK Android a partir do release mais recente:

- https://github.com/jeffev/gasto/releases/latest/download/gasto.apk

> Caso ainda não exista o arquivo, crie um release no GitHub e carregue `gasto.apk` como asset.

---

## Categorias de despesa

Alimentação · Transporte · Saúde · Lazer · Casa · Educação · Assinaturas · Vestuário · Outros

## Categorias de entrada

Salário · Freelance · Investimentos · Aluguel recebido · Presente · Outros

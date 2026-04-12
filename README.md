# Gastô

> App Android de finanças pessoais com registro por voz e texto, classificação automática offline e relatórios mensais.

[![Download APK](https://img.shields.io/badge/Download-APK-6C63FF?style=for-the-badge&logo=android)](https://github.com/jeffev/gasto/releases/latest/download/gasto.apk)
[![GitHub Pages](https://img.shields.io/badge/Site-GitHub%20Pages-222?style=for-the-badge&logo=github)](https://jeffev.github.io/gasto/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

## Como funciona

O usuário fala ou digita algo como *"uber vinte reais"*. O app transcreve a fala via Google STT nativo do Android, extrai o valor e prediz a categoria usando um modelo TF-IDF + LinearSVC que roda **localmente no celular**, e salva no SQLite — sem servidor de dados, sem cadastro.

---

## Funcionalidades

| | Funcionalidade |
|---|---|
| 🎙️ | Registro por voz em linguagem natural (Google STT) |
| ⌨️ | Registro por texto — mesmo resultado |
| 🤖 | Classificação offline (TF-IDF + LinearSVC em TypeScript) |
| 💰 | Entradas e despesas separadas |
| 🔄 | Despesas recorrentes automáticas |
| 🎯 | Orçamento por categoria com alertas |
| 📈 | Meta de economia mensal |
| 📊 | Relatórios com gráfico de distribuição e gastos por dia |
| 🗓️ | Histórico de qualquer mês |
| 📤 | Exportar CSV |
| 🌙 | Modo escuro automático |
| 🔒 | 100% local — SQLite no dispositivo |

---

## Estrutura do repositório

```
gasto/
├── app/                        # React Native (Expo SDK 54)
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── index.tsx       # Aba Despesas
│   │   │   ├── income.tsx      # Aba Entradas
│   │   │   └── reports.tsx     # Aba Relatórios
│   │   ├── confirm.tsx         # Confirmação/edição antes de salvar
│   │   ├── edit.tsx            # Edição de despesa existente
│   │   ├── add-entrada.tsx     # Nova entrada de receita
│   │   ├── budget.tsx          # Orçamentos por categoria
│   │   └── termos.tsx          # Termos de uso / privacidade
│   ├── components/
│   │   └── ExpenseItem.tsx     # Card com swipe para deletar
│   ├── lib/
│   │   ├── db.ts               # Camada SQLite (expo-sqlite)
│   │   ├── api.ts              # parseTexto
│   │   ├── classifier.ts       # Inferência TF-IDF + LinearSVC offline
│   │   ├── theme.ts            # Tokens de cor claro/escuro
│   │   └── types.ts            # Tipos TypeScript compartilhados
│   ├── constants/
│   │   ├── categories.ts       # 9 categorias de despesa
│   │   └── incomeCategories.ts # 6 categorias de entrada
│   └── assets/
│       └── model.json          # Modelo exportado pelo export_model.py
│
├── backend/                    # Python / FastAPI (legado, não utilizado pelo app)
│   ├── main.py                 # Endpoint /transcribe (Whisper) e /feedback
│   ├── classifier.py           # Wrapper sklearn para re-treino online
│   └── requirements.txt
│
├── model/                      # Pipeline de treinamento do classificador
│   ├── generate_dataset.py     # Gera dataset sintético em português
│   ├── train.py                # Treina TF-IDF + LinearSVC
│   ├── export_model.py         # Exporta modelo para app/assets/model.json
│   └── data/
│       └── dataset.csv         # Dataset de treino (versionado)
│
└── docs/                       # Site GitHub Pages
```

---

## Stack

| Camada | Tecnologia | Notas |
|---|---|---|
| App | React Native 0.81 + Expo SDK 54 | TypeScript, bare workflow |
| Navegação | Expo Router 6 (file-based) | |
| Banco de dados | SQLite via `expo-sqlite` | Local, sem sincronização |
| Classificador | TF-IDF + LinearSVC | sklearn → JSON → TS, roda no device |
| Transcrição de voz | Google STT nativo (`@react-native-voice/voice`) | Requer internet; usa o reconhecedor embutido no Android |
| Gráficos | `react-native-svg` | |
| Animações | `react-native-reanimated` 4.x | Requer New Architecture |

---

## Setup local

### Pré-requisitos

- Node.js 18+
- Android Studio com SDK 34+ (ou dispositivo físico)
- Python 3.11+ (somente para backend/modelo)

### 1. App

```bash
cd app
npm install
npx expo start
```

> O app usa `newArchEnabled: true` (New Architecture). Para rodar no Expo Go, o módulo `whisper.rn` é importado de forma lazy e não afeta o bundle.

### 2. Gerar APK de release

```bash
cd app
npx expo prebuild --platform android --clean
echo "sdk.dir=$HOME/Android/Sdk" > android/local.properties   # ajuste o caminho
cd android && ./gradlew assembleRelease
```

APK gerado em `android/app/build/outputs/apk/release/app-release.apk`.

### 3. Re-treinar o classificador (opcional)

```bash
cd model
pip install -r requirements.txt

python generate_dataset.py   # regenera dataset sintético
python train.py              # treina TF-IDF + LinearSVC
python export_model.py       # grava app/assets/model.json
```

O modelo é um arquivo JSON com vocabulário, pesos IDF e coeficientes do SVC — sem dependência de runtime Python no app.

---

## Arquitetura

```
fala do usuário
     │
     ▼ (expo-speech-recognition)
Google STT  ─── requer internet
     │
     ▼
texto transcrito
     │
     ▼
normalização (lowercase, remove pontuação, stopwords PT)
     │
     ▼
TF-IDF vectorizer  ←── vocabulário do model.json
     │
     ▼
LinearSVC predict  ←── coeficientes do model.json  ← 100% offline
     │
     ▼
categoria + top-3 sugestões + extração de valor
```

O modo texto (digitado) bypassa o Google STT e vai direto para a normalização — 100% offline.

Para adicionar categorias ou melhorar a acurácia: edite o dataset em `model/data/dataset.csv`, re-treine e exporte.

---

## Como contribuir

Contribuições são bem-vindas. Algumas áreas abertas:

- **Voz offline** — atualmente usa Google STT (requer internet); contribuições para transcrição 100% offline são bem-vindas (ex: vosk-react-native, sherpa-onnx)
- **Testes automatizados** — o projeto não tem testes; testes unitários para `classifier.ts` e `db.ts` seriam um bom começo
- **iOS** — o app foi desenvolvido e testado apenas em Android; a estrutura Expo suporta iOS mas não foi validado
- **Sincronização opcional** — exportação para nuvem (iCloud / Google Drive) sem comprometer o modelo local-first
- **Melhorias no dataset** — mais exemplos no `dataset.csv` melhoram diretamente a acurácia da classificação

### Fluxo

```bash
# 1. Fork + clone
git clone https://github.com/SEU_USUARIO/gasto.git

# 2. Crie uma branch
git checkout -b feat/minha-contribuicao

# 3. Faça as alterações e commit
git commit -m "feat: descrição clara do que foi feito"

# 4. Abra um Pull Request para main
```

---

## Links

- **Site:** https://jeffev.github.io/gasto/
- **Download APK:** https://github.com/jeffev/gasto/releases/latest/download/gasto.apk
- **Issues / sugestões:** https://github.com/jeffev/gasto/issues

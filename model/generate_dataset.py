"""
Gerador de dataset para classificação de despesas em português.
Gera 10.000 frases categorizadas como um usuário brasileiro faria no app.
"""

import random
import csv
import os

random.seed(42)

# ---------------------------------------------------------------------------
# Vocabulário por categoria
# ---------------------------------------------------------------------------

CATEGORIAS = {
    "Alimentação": {
        "itens": [
            "lanche", "almoço", "jantar", "café", "café da manhã", "ceia",
            "padaria", "supermercado", "mercado", "feira", "açougue", "hortifruti",
            "restaurante", "lanchonete", "pizzaria", "hamburgueria", "pastelaria",
            "delivery", "iFood", "Rappi", "Uber Eats",
            "pizza", "hambúrguer", "hamburguer", "x-burguer", "x-salada",
            "sushi", "japonês", "rodízio", "churrasco", "espetinho",
            "açaí", "sorvete", "brigadeiro", "bolo", "torta",
            "coxinha", "salgado", "esfiha", "pão de queijo", "pastel",
            "marmita", "quentinha", "self-service", "comida por quilo",
            "McDonald's", "Burger King", "Subway", "Bob's", "Habib's",
            "Starbucks", "Bob's", "Outback",
            "café expresso", "cappuccino", "suco", "vitamina", "smoothie",
            "refrigerante", "água", "água mineral", "cerveja", "chopp",
            "vinho", "cachaça", "drinque", "caipirinha",
            "bar", "boteco", "buteco", "happy hour",
            "biscoito", "bolacha", "snack", "pipoca",
            "mercadinho", "minimercado", "conveniência",
            "fruta", "verdura", "legume", "carne", "frango", "peixe",
            "ovo", "leite", "queijo", "iogurte", "manteiga",
            "pão", "massa", "arroz", "feijão", "macarrão",
            "chá", "achocolatado", "energético",
        ],
        "templates": [
            "{item}",
            "{item} {valor}",
            "{item} no {local}",
            "{item} no {local} {valor}",
            "comprei {item}",
            "comprei {item} {valor}",
            "almocei no {local}",
            "almocei no {local} {valor}",
            "jantei fora {valor}",
            "pedi {item} no delivery",
            "pedi {item} no delivery {valor}",
            "delivery {item} {valor}",
            "{item} pra hoje",
            "conta do {item} {valor}",
            "dividi conta do {item}",
            "café da manhã {valor}",
            "lanche da tarde {valor}",
            "feira do mês {valor}",
            "mercado {valor}",
            "supermercado {valor}",
            "compras do mês {valor}",
            "compras da semana {valor}",
            "rancho {valor}",
        ],
        "locais": [
            "restaurante", "shopping", "mall", "mercado", "supermercado",
            "padaria", "lanchonete", "bar", "boteco", "praça de alimentação",
            "food truck", "feira",
        ],
    },

    "Transporte": {
        "itens": [
            "Uber", "99", "táxi", "taxi", "99pop", "Uber Pool", "Uber Black",
            "ônibus", "onibus", "metrô", "metro", "trem", "VLT", "BRT",
            "passagem", "bilhete", "cartão transporte", "cartão de transporte",
            "gasolina", "combustível", "etanol", "diesel", "abastecimento",
            "estacionamento", "estacionei", "valet", "zona azul",
            "pedágio", "pedagio", "rodovia",
            "Moovit", "BlaBlaCar", "carona",
            "moto", "mototáxi", "motofrete",
            "bicicleta", "bike", "patinete", "scooter", "Grin", "Yellow",
            "aluguel de carro", "locadora", "Localiza", "Movida", "Unidas",
            "manutenção do carro", "revisão do carro", "troca de óleo",
            "pneu", "borracheiro", "mecânico",
            "seguro do carro", "IPVA", "licenciamento",
            "avião", "passagem aérea", "voo", "LATAM", "Gol", "Azul",
            "ônibus interestadual", "viação",
        ],
        "templates": [
            "{item}",
            "{item} {valor}",
            "{item} pro trabalho",
            "{item} pro trabalho {valor}",
            "{item} pra casa",
            "{item} pra casa {valor}",
            "peguei {item}",
            "peguei {item} {valor}",
            "abasteci {valor}",
            "abasteci o carro {valor}",
            "gasolina {valor}",
            "combustível {valor}",
            "{item} de volta",
            "{item} de volta {valor}",
            "passagem de {item} {valor}",
            "estacionei {valor}",
            "estacionamento {valor}",
            "pedágio {valor}",
            "corrida {valor}",
            "corrida de {item} {valor}",
            "{item} da semana {valor}",
            "revisão do carro {valor}",
            "troca de óleo {valor}",
        ],
        "locais": ["trabalho", "casa", "faculdade", "shopping", "centro", "aeroporto"],
    },

    "Saúde": {
        "itens": [
            "farmácia", "remédio", "medicamento", "antibiótico", "vitamina",
            "suplemento", "proteína", "whey", "creatina",
            "consulta", "consulta médica", "médico", "clínica",
            "dentista", "consulta dentista", "limpeza dental", "extração",
            "psicólogo", "psiquiatra", "terapeuta", "terapia",
            "fisioterapeuta", "fisioterapia", "quiropraxia",
            "exame", "exame de sangue", "ultrassom", "raio-x", "ressonância",
            "laboratório", "análises clínicas",
            "hospital", "pronto-socorro", "UPA", "emergência",
            "plano de saúde", "convênio", "mensalidade plano",
            "academia", "gym", "mensalidade academia",
            "pilates", "yoga", "natação", "crossfit", "musculação",
            "óculos", "lente de contato", "ótica",
            "curativo", "seringa", "esparadrapo", "band-aid",
            "pomada", "creme", "loção", "protetor solar",
        ],
        "templates": [
            "{item}",
            "{item} {valor}",
            "comprei {item}",
            "comprei {item} {valor}",
            "consulta com {item} {valor}",
            "fui na {item}",
            "fui na {item} {valor}",
            "paguei a {item}",
            "paguei a {item} {valor}",
            "mensalidade da {item} {valor}",
            "mensalidade {item} {valor}",
            "exame no laboratório {valor}",
            "remédio da {item} {valor}",
            "receita médica {valor}",
            "{item} da semana {valor}",
            "{item} mensal {valor}",
        ],
        "locais": ["clínica", "hospital", "farmácia", "laboratório", "UPA"],
    },

    "Lazer": {
        "itens": [
            "cinema", "filme", "sessão de cinema",
            "teatro", "peça de teatro", "musical",
            "show", "show de música", "festival", "evento",
            "parque", "parque de diversões", "zoológico", "aquário",
            "museu", "exposição",
            "viagem", "passeio", "turismo", "tour",
            "hotel", "hospedagem", "pousada", "hostel", "Airbnb",
            "praia", "campo", "serra", "cachoeira",
            "jogo", "game", "videogame", "PlayStation", "Xbox",
            "Steam", "jogos no Steam",
            "livro", "e-book", "audiobook",
            "revista", "gibi", "quadrinhos",
            "esporte", "futebol", "ingresso", "estádio",
            "boliche", "laser tag", "escape room", "paintball",
            "karaokê", "festa", "balada", "clube",
            "Netflix", "Spotify", "Amazon Prime", "Disney+", "HBO Max",
            "YouTube Premium", "Deezer", "Apple Music",
            "brinquedo", "jogo de tabuleiro",
            "fotografia", "câmera",
            "passeio de barco", "caiaque",
        ],
        "templates": [
            "{item}",
            "{item} {valor}",
            "fui ao {item}",
            "fui ao {item} {valor}",
            "ingresso do {item} {valor}",
            "ingresso pro {item} {valor}",
            "comprei {item}",
            "comprei {item} {valor}",
            "assinei {item}",
            "assinei {item} {valor}",
            "viagem para {local} {valor}",
            "passeio {valor}",
            "entretenimento {valor}",
            "diversão {valor}",
            "hotel {valor}",
            "hospedagem {valor}",
            "{item} com a família {valor}",
            "{item} com amigos {valor}",
            "saída {valor}",
            "fim de semana {valor}",
        ],
        "locais": ["praia", "campo", "serra", "interior", "litoral", "outro estado"],
    },

    "Casa": {
        "itens": [
            "aluguel", "aluguel do apartamento", "aluguel da casa",
            "condomínio", "taxa de condomínio",
            "IPTU", "imposto predial",
            "luz", "conta de luz", "energia elétrica", "energia",
            "água", "conta de água", "esgoto",
            "gás", "gás de cozinha", "botijão de gás",
            "internet", "Wi-Fi", "banda larga",
            "telefone", "telefone fixo",
            "TV a cabo", "TV por assinatura", "NET", "Claro TV", "Sky",
            "faxineira", "diarista", "limpeza", "empregada",
            "reforma", "obra", "pedreiro", "pintura", "eletricista", "encanador",
            "móvel", "móveis", "sofá", "cama", "guarda-roupa", "mesa",
            "eletrodoméstico", "geladeira", "fogão", "micro-ondas", "máquina de lavar",
            "decoração", "tapete", "cortina", "luminária", "quadro",
            "ferramentas", "parafuso", "tinta", "telhado",
            "jardinagem", "jardineiro", "plantas",
            "seguro residencial", "seguro da casa",
            "material de limpeza", "sabão", "detergente", "desinfetante",
            "papel higiênico", "fraldas",
            "dedetização", "desentupimento",
        ],
        "templates": [
            "{item}",
            "{item} {valor}",
            "paguei {item}",
            "paguei {item} {valor}",
            "conta de {item} {valor}",
            "boleto do {item} {valor}",
            "boleto de {item} {valor}",
            "{item} do mês {valor}",
            "{item} mensal {valor}",
            "manutenção {valor}",
            "manutenção da {item} {valor}",
            "comprei {item}",
            "comprei {item} {valor}",
            "conserto {valor}",
            "reforma {valor}",
            "material de construção {valor}",
            "{item} para a casa {valor}",
        ],
        "locais": [],
    },

    "Educação": {
        "itens": [
            "faculdade", "universidade", "mensalidade da faculdade",
            "faculdade particular", "mensalidade universitária",
            "curso", "curso online", "curso presencial",
            "Udemy", "Coursera", "Alura", "DIO", "Rocketseat",
            "inglês", "espanhol", "francês", "alemão", "idioma",
            "escola de idiomas", "CNA", "CCAA", "Wizard", "Fisk",
            "MBA", "pós-graduação", "especialização",
            "mestrado", "doutorado",
            "workshop", "webinar", "evento profissional",
            "certificação", "certificado", "prova", "exame",
            "livro didático", "apostila", "material escolar",
            "caderno", "caneta", "lápis", "borracha", "régua",
            "mochila", "material para curso",
            "escola", "colégio", "mensalidade escolar",
            "reforço escolar", "professor particular", "tutoria",
            "cursinho pré-vestibular", "ENEM", "concurso público",
            "OAB", "CRC", "CRM", "CFO",
        ],
        "templates": [
            "{item}",
            "{item} {valor}",
            "mensalidade da {item} {valor}",
            "mensalidade {item} {valor}",
            "paguei {item}",
            "paguei {item} {valor}",
            "comprei {item}",
            "comprei {item} {valor}",
            "assinei {item}",
            "assinei {item} {valor}",
            "curso de {item} {valor}",
            "aula de {item} {valor}",
            "material de {item} {valor}",
            "matrícula {valor}",
            "matrícula no curso {valor}",
            "certificação {valor}",
            "workshop {valor}",
        ],
        "locais": [],
    },

    "Assinaturas": {
        "itens": [
            "Netflix", "Spotify", "Amazon Prime", "Amazon Prime Video",
            "Disney+", "Disney Plus", "HBO Max", "Paramount+",
            "Globoplay", "Telecine", "Mubi",
            "YouTube Premium", "YouTube Music",
            "Deezer", "Apple Music", "Tidal",
            "iCloud", "Google One", "Google Drive",
            "Dropbox", "OneDrive",
            "Office 365", "Microsoft 365",
            "Adobe Creative Cloud", "Photoshop", "Illustrator",
            "antivírus", "Norton", "Kaspersky", "McAfee",
            "plano de celular", "plano móvel", "Tim", "Claro", "Vivo", "Oi",
            "internet", "plano de internet", "banda larga",
            "VPN", "NordVPN", "ExpressVPN",
            "Canva Pro", "Figma", "Notion",
            "Xbox Game Pass", "PlayStation Plus", "Nintendo Online",
            "Steam", "Epic Games",
            "Duolingo Plus", "Headspace", "Calm",
            "Shein", "Amazon",
            "clube de assinatura", "box mensal",
        ],
        "templates": [
            "{item}",
            "{item} {valor}",
            "assinatura do {item}",
            "assinatura do {item} {valor}",
            "assinatura {item} {valor}",
            "renovação {item}",
            "renovação {item} {valor}",
            "mensalidade {item}",
            "mensalidade {item} {valor}",
            "anuidade {item} {valor}",
            "cobrou {item}",
            "cobrou {item} {valor}",
            "plano {item} {valor}",
            "plano mensal {item} {valor}",
            "plano anual {item} {valor}",
            "renovei {item} {valor}",
        ],
        "locais": [],
    },

    "Vestuário": {
        "itens": [
            "roupa", "roupas", "peça de roupa",
            "camisa", "camiseta", "blusa", "regata", "polo",
            "calça", "calça jeans", "bermuda", "shorts",
            "vestido", "saia", "macacão",
            "jaqueta", "casaco", "moletom", "blusa de frio", "sobretudo",
            "meia", "cueca", "calcinha", "sutiã", "lingerie",
            "pijama", "roupa de dormir",
            "tênis", "sapato", "sandália", "chinelo", "salto",
            "bota", "coturnos",
            "bolsa", "mochila", "carteira", "pochete",
            "cinto", "gravata", "lenço", "chapéu", "boné",
            "óculos de sol", "joia", "brinco", "colar", "pulseira", "anel",
            "relógio",
            "roupa de academia", "roupa de banho", "biquíni", "sunga",
            "uniforme", "roupa de trabalho",
            "Renner", "C&A", "Riachuelo", "Zara", "H&M", "Forever 21",
            "Nike", "Adidas", "Puma", "Under Armour", "Hering",
        ],
        "templates": [
            "{item}",
            "{item} {valor}",
            "comprei {item}",
            "comprei {item} {valor}",
            "{item} na {local}",
            "{item} na {local} {valor}",
            "comprei {item} na {local} {valor}",
            "roupas {valor}",
            "compras de roupa {valor}",
            "{item} novo {valor}",
            "{item} nova {valor}",
            "par de {item} {valor}",
            "loja de roupa {valor}",
        ],
        "locais": ["Renner", "C&A", "Riachuelo", "Zara", "H&M", "shopping", "loja", "outlet"],
    },

    "Outros": {
        "itens": [
            "presente", "presente de aniversário", "presente de natal",
            "doação", "caridade", "dízimo", "oferta",
            "empréstimo", "emprestei dinheiro",
            "multa", "multa de trânsito", "multa", "infração",
            "imposto", "IPTU", "IPVA", "IR", "imposto de renda",
            "taxa", "taxa bancária", "tarifa",
            "anuidade", "anuidade cartão",
            "cartório", "registro", "notário",
            "advogado", "honorário", "processo",
            "conserto", "manutenção", "reparo",
            "celular", "smartphone", "iPhone", "Samsung",
            "computador", "notebook", "tablet",
            "acessório", "carregador", "cabo", "fone de ouvido",
            "câmera", "eletrônico",
            "pet", "veterinário", "ração", "remédio pet",
            "pet shop", "banho e tosa", "consultório veterinário",
            "papelaria", "material de escritório",
            "saque", "transferência",
            "mesada", "cabo", "serviço",
        ],
        "templates": [
            "{item}",
            "{item} {valor}",
            "paguei {item}",
            "paguei {item} {valor}",
            "comprei {item}",
            "comprei {item} {valor}",
            "{item} do mês {valor}",
            "{item} imprevisto {valor}",
            "gasto com {item} {valor}",
            "despesa com {item} {valor}",
            "conserto do {item} {valor}",
            "{item} para {local}",
            "{item} para {local} {valor}",
            "presente pra {local} {valor}",
        ],
        "locais": ["aniversário", "natal", "casamento", "formatura", "chá de bebê"],
    },
}

# ---------------------------------------------------------------------------
# Gerador de valores monetários realistas
# ---------------------------------------------------------------------------

def gerar_valor():
    """Gera representações textuais de valores monetários."""
    tipo = random.random()

    if tipo < 0.3:
        # Sem valor (só descrição)
        return ""
    elif tipo < 0.5:
        # Valor inteiro
        v = random.choice([5,8,10,12,15,18,20,25,30,35,40,45,50,60,70,80,90,
                           100,120,150,180,200,250,300,350,400,500,600,700,
                           800,900,1000,1200,1500,2000,2500,3000])
        fmt = random.choice([
            f"{v} reais",
            f"R$ {v}",
            f"R${v}",
            f"{v}",
            f"{v},00",
            f"R$ {v},00",
        ])
        return fmt
    else:
        # Valor com centavos
        reais = random.choice([5,8,9,10,12,14,15,17,19,20,22,24,25,27,29,
                               30,32,35,37,39,40,42,45,47,49,50,55,59,
                               60,65,69,70,75,79,80,85,89,90,95,99,
                               100,110,119,120,129,130,139,140,149,150])
        centavos = random.choice([10,20,25,30,40,50,60,70,75,80,90,99])
        fmt = random.choice([
            f"{reais},{centavos:02d}",
            f"R$ {reais},{centavos:02d}",
            f"R${reais},{centavos:02d}",
            f"{reais}.{centavos:02d}",
        ])
        return fmt


# ---------------------------------------------------------------------------
# Variações de escrita (simular digitação real)
# ---------------------------------------------------------------------------

ABREVIACOES = {
    "restaurante": ["rest", "restau", "restaurante"],
    "supermercado": ["super", "supermercado", "mercado", "mercadão"],
    "hambúrguer": ["hamburguer", "hamburgão", "burguer", "burger"],
    "ônibus": ["onibus", "bus", "ônibus"],
    "gasolina": ["gasol", "gasolina", "gaso"],
    "farmácia": ["farmacia", "farmácia", "farma"],
    "academia": ["academia", "acad"],
    "mensalidade": ["mensalidade", "mensal"],
}

def aplicar_variacao(texto):
    """Aplica variações realistas de digitação."""
    variações = [
        lambda t: t.lower(),
        lambda t: t.upper(),
        lambda t: t.capitalize(),
        lambda t: t,  # normal
        lambda t: t.replace("ã", "a").replace("é", "e").replace("ê", "e")
                    .replace("á", "a").replace("ó", "o").replace("ú", "u")
                    .replace("í", "i").replace("â", "a").replace("ô", "o"),
        lambda t: t,
        lambda t: t,
        lambda t: t,
    ]
    fn = random.choice(variações)
    return fn(texto)


# ---------------------------------------------------------------------------
# Gerador principal
# ---------------------------------------------------------------------------

def gerar_frase(categoria, dados):
    template = random.choice(dados["templates"])
    item = random.choice(dados["itens"])
    valor = gerar_valor()
    local = random.choice(dados["locais"]) if dados.get("locais") else ""

    frase = template.format(
        item=item,
        valor=valor,
        local=local if local else item,
    ).strip()

    # Remove espaços duplos
    frase = " ".join(frase.split())

    # Aplica variação de digitação
    frase = aplicar_variacao(frase)

    return frase


def gerar_dataset(n=10000, output_path="dataset.csv"):
    categorias = list(CATEGORIAS.keys())
    por_categoria = n // len(categorias)
    resto = n % len(categorias)

    registros = []

    for i, cat in enumerate(categorias):
        qtd = por_categoria + (1 if i < resto else 0)
        dados = CATEGORIAS[cat]
        for _ in range(qtd):
            frase = gerar_frase(cat, dados)
            registros.append((frase, cat))

    # Embaralha para não ter blocos por categoria
    random.shuffle(registros)

    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["texto", "categoria"])
        writer.writerows(registros)

    print(f"Dataset gerado: {output_path}")
    print(f"Total de registros: {len(registros)}")
    print("\nDistribuição por categoria:")
    from collections import Counter
    contagem = Counter(cat for _, cat in registros)
    for cat, qtd in sorted(contagem.items()):
        print(f"  {cat:<20} {qtd:>5} registros")

    return registros


if __name__ == "__main__":
    gerar_dataset(n=10000, output_path="data/dataset.csv")

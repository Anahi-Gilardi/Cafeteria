import { MenuItem, Table } from "../types";

export const MENU_ITEMS: MenuItem[] = [
  // COFFEE & SPECIALTIES (Especialidades Porteñas)
  {
    id: "arg-submarino",
    name: "Submarino de Chocolate Bariloche",
    price: 4.50,
    takeawayPrice: 4.05,
    deliveryPrice: 5.20,
    description: "Una de las tradiciones más queridas de Argentina: una jarrita de leche entera de campo bien caliente, servida con una barra entera de chocolate artesanal de Bariloche para sumergir y derretir pacientemente.",
    category: "coffee",
    tags: ["Especial", "Artesanal"],
    image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: {
      calories: 290,
      allergens: ["Lácteos"]
    },
    stock: 25,
    recipe: [
      { ingredientId: "ins-leche", amount: 0.25 },
      { ingredientId: "ins-chocolate", amount: 1.0 }
    ]
  },
  {
    id: "arg-lagrima-portena",
    name: "Lágrima Porteña de Autor",
    price: 3.80,
    takeawayPrice: 3.40,
    deliveryPrice: 4.40,
    description: "Un clásico porteño para los amantes de la leche cremosa: jarrito lleno de leche vaporizada de textura aterciopelada con apenas unas gotitas (una 'lágrima') de nuestro espresso de especialidad.",
    category: "coffee",
    tags: ["Recomendado"],
    image: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: {
      calories: 120,
      allergens: ["Lácteos"]
    },
    stock: 35,
    recipe: [
      { ingredientId: "ins-leche", amount: 0.20 },
      { ingredientId: "ins-cafe", amount: 0.005 }
    ]
  },
  {
    id: "arg-cafecito-jarrito",
    name: "Café en Jarrito Doble",
    price: 2.90,
    takeawayPrice: 2.60,
    deliveryPrice: 3.35,
    description: "El alma de Buenos Aires. Espresso doble corto de nuestra selección de granos tostados artesanalmente, servido en el tradicional jarrito de vidrio templado porteño, con una crema dorada impecable.",
    category: "coffee",
    tags: ["Especial"],
    image: "https://images.unsplash.com/photo-1510972527409-cef6e4a4d64e?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: {
      calories: 10,
      allergens: []
    },
    stock: 50,
    recipe: [
      { ingredientId: "ins-cafe", amount: 0.015 }
    ]
  },
  {
    id: "arg-capuchino-italiano",
    name: "Capuchino con Cacao y Canela",
    price: 3.90,
    takeawayPrice: 3.50,
    deliveryPrice: 4.50,
    description: "La receta porteña del tradicional capuchino: espresso doble, leche vaporizada muy espumosa, espolvoreado con canela molida fina y ralladura de chocolate amargo.",
    category: "coffee",
    tags: ["Clásico"],
    image: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: {
      calories: 160,
      allergens: ["Lácteos"]
    },
    stock: 30,
    recipe: [
      { ingredientId: "ins-leche", amount: 0.15 },
      { ingredientId: "ins-cafe", amount: 0.015 },
      { ingredientId: "ins-chocolate", amount: 0.15 }
    ]
  },
  {
    id: "arg-cafe-crema",
    name: "Café Vienés Porteño (con Crema)",
    price: 4.10,
    takeawayPrice: 3.70,
    deliveryPrice: 4.70,
    description: "Café de filtro doble intenso coronado con una generosa copa de crema chantilly batida artesanalmente a mano y decorado con hilos de dulce de leche.",
    category: "coffee",
    tags: ["Especial"],
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: {
      calories: 220,
      allergens: ["Lácteos"]
    },
    stock: 20,
    recipe: [
      { ingredientId: "ins-cafe", amount: 0.015 },
      { ingredientId: "ins-leche", amount: 0.05 }
    ]
  },
 
  // TRADITIONAL COFFEE (Clásicos)
  {
    id: "arg-cortado",
    name: "Café Cortado en Jarrito",
    price: 3.20,
    takeawayPrice: 2.90,
    deliveryPrice: 3.70,
    description: "Un espresso doble 'cortado' con un chorrito fino de leche caliente vaporizada, servido en vasito de vidrio. Acompañado con soda fría de cortesía, tal como se sirve en nuestra casa.",
    category: "traditional",
    tags: ["Recomendado"],
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: {
      calories: 60,
      allergens: ["Lácteos"]
    },
    stock: 45,
    recipe: [
      { ingredientId: "ins-cafe", amount: 0.015 },
      { ingredientId: "ins-leche", amount: 0.05 }
    ]
  },
  {
    id: "arg-cafe-leche",
    name: "Café con Leche Clásico",
    price: 3.50,
    takeawayPrice: 3.15,
    deliveryPrice: 4.05,
    description: "El compañero ineludible de la merienda nacional. Espresso doble estirado combinado en partes iguales con leche vaporizada bien caliente, servido en taza de loza clásica de café notable.",
    category: "traditional",
    tags: [],
    image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: {
      calories: 140,
      allergens: ["Lácteos"]
    },
    stock: 40,
    recipe: [
      { ingredientId: "ins-cafe", amount: 0.015 },
      { ingredientId: "ins-leche", amount: 0.15 }
    ]
  },
  {
    id: "arg-mate-mesa",
    name: "Mate Tradicional en Mesa",
    price: 4.80,
    takeawayPrice: 4.30,
    deliveryPrice: 5.50,
    description: "Servicio completo para vivir el ritual: termo de agua caliente con temperatura exacta, mate de calabaza forrado en cuero, bombilla de alpaca y yerba mate orgánica premium a elección (suave o con notas de campo).",
    category: "traditional",
    tags: ["Especial", "Vegano"],
    image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=600",
    customizable: false,
    nutrition: {
      calories: 10,
      allergens: []
    },
    stock: 12,
    recipe: [
      { ingredientId: "ins-yerba", amount: 0.05 }
    ]
  },
 
  // COLD DRINKS (Bebidas Frías)
  {
    id: "arg-iced-dulce-leche",
    name: "Iced Latte de Dulce de Leche",
    price: 4.50,
    takeawayPrice: 4.05,
    deliveryPrice: 5.20,
    description: "Espresso doble de especialidad vertido sobre leche cremosa bien fría con abundante hielo, fusionado con dulce de leche repostero artesanal de primera calidad.",
    category: "cold",
    tags: ["Recomendado", "Especial"],
    image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: {
      calories: 240,
      allergens: ["Lácteos"]
    },
    stock: 25,
    recipe: [
      { ingredientId: "ins-cafe", amount: 0.015 },
      { ingredientId: "ins-leche", amount: 0.20 },
      { ingredientId: "ins-ddl", amount: 0.03 }
    ]
  },
  {
    id: "arg-pomelo-tonica",
    name: "Espresso Tónica de Pomelo Pampeano",
    price: 4.20,
    description: "La frescura del campo argentino: café extraído en frío mezclado con agua tónica premium, almíbar artesanal de pomelo rosado pampeano y una rodaja fresca.",
    category: "cold",
    tags: ["Vegano", "Sin Gluten"],
    image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=600",
    customizable: false,
    nutrition: {
      calories: 85,
      allergens: []
    },
    stock: 15
  },
  {
    id: "arg-mate-cocido-helado",
    name: "Mate Cocido Helado con Limón y Menta",
    price: 3.80,
    description: "Infusión helada de yerba mate orgánica premium seleccionada, endulzada ligeramente con miel de San Luis, rodajas de limón y menta fresca del huerto.",
    category: "cold",
    tags: ["Vegano", "Sin Gluten", "Artesanal"],
    image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=600",
    customizable: false,
    nutrition: {
      calories: 50,
      allergens: []
    },
    stock: 20
  },

  // BAKERY (Facturas, Alfajores y Tortas)
  {
    id: "arg-medialuna-manteca",
    name: "Trío de Medialunas de Manteca",
    price: 3.60,
    description: "Hojaldre artesanal premium elaborado con manteca de primera calidad, horneadas cada mañana hasta quedar doradas y pintadas generosamente con almíbar de cítricos secretos.",
    category: "bakery",
    tags: ["Artesanal", "Recomendado"],
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: {
      calories: 320,
      allergens: ["Gluten", "Lácteos", "Huevo"]
    },
    stock: 60
  },
  {
    id: "arg-medialuna-grasa",
    name: "Trío de Medialunas de Grasa",
    price: 3.60,
    description: "La versión salada y crocante del clásico rioplatense. Masa hojaldrada fina con grasa vacuna refinada, de sabor suavemente salado y textura increíblemente crujiente.",
    category: "bakery",
    tags: ["Artesanal"],
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: {
      calories: 290,
      allergens: ["Gluten"]
    },
    stock: 45
  },
  {
    id: "arg-alfajor-maicena",
    name: "Alfajor de Maicena Tradicional",
    price: 2.80,
    description: "Auténtico alfajor artesanal de almidón de maíz que se desarma en la boca, relleno de abundante dulce de leche repostero y rebozado suavemente en coco rallado.",
    category: "bakery",
    tags: ["Artesanal", "Recomendado"],
    image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&q=80&w=600",
    customizable: false,
    nutrition: {
      calories: 260,
      allergens: ["Gluten", "Lácteos", "Huevo"]
    },
    stock: 30
  },
  {
    id: "arg-alfajor-marplatense",
    name: "Alfajor Marplatense de Chocolate",
    price: 3.20,
    description: "Inspirado en los famosos alfajores de la Costa Atlántica. Dos tapitas húmedas de cacao rellenas con dulce de leche artesanal, bañadas en chocolate semiamargo belga.",
    category: "bakery",
    tags: ["Especial"],
    image: "https://images.unsplash.com/photo-1581798459219-318e76aeec7b?auto=format&fit=crop&q=80&w=600",
    customizable: false,
    nutrition: {
      calories: 310,
      allergens: ["Gluten", "Lácteos", "Huevo", "Soja"]
    },
    stock: 25
  },
  {
    id: "arg-pastafrola",
    name: "Porción de Pastafrola de Membrillo",
    price: 3.40,
    description: "Tarta tradicional argentina de masa quebrada dulce, perfumada con vainilla y ralladura de limón, rellena de dulce de membrillo derretido y decorada con el clásico enrejado.",
    category: "bakery",
    tags: ["Artesanal"],
    image: "https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: {
      calories: 340,
      allergens: ["Gluten", "Huevo"]
    },
    stock: 15
  },
  {
    id: "arg-chocotorta",
    name: "Chocotorta Porteña del Barrio",
    price: 4.50,
    description: "El postre favorito de los cumpleaños y meriendas argentinas. Capas de galletitas Chocolinas remojadas en café expreso intenso, intercaladas con una crema adictiva de dulce de leche y queso crema batido.",
    category: "bakery",
    tags: ["Especial", "Recomendado"],
    image: "https://images.unsplash.com/photo-1508737027454-e6454ef45afd?auto=format&fit=crop&q=80&w=600",
    customizable: false,
    nutrition: {
      calories: 420,
      allergens: ["Gluten", "Lácteos", "Soja"]
    },
    stock: 12
  },
  {
    id: "arg-torta-rogel",
    name: "Milhojas Rogel de Autor",
    price: 4.80,
    description: "La cumbre de la repostería criolla. Ocho capas finas e increíblemente crocantes de masa de yemas unidas por dulce de leche repostero puro, cubiertas con un suntuoso merengue italiano flameado.",
    category: "bakery",
    tags: ["Artesanal"],
    image: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&q=80&w=600",
    customizable: false,
    nutrition: {
      calories: 460,
      allergens: ["Gluten", "Lácteos", "Huevo"]
    },
    stock: 10
  },
  {
    id: "arg-torta-balcarce",
    name: "Torta Balcarce Tradicional",
    price: 4.60,
    description: "Porción de la clásica torta bonaerense: bizcochuelo húmedo relleno de dulce de leche, crema de vainilla chantilly, castañas en almíbar, merenguitos secos crocantes y espolvoreado con coco rallado.",
    category: "bakery",
    tags: ["Clásico"],
    image: "https://images.unsplash.com/photo-1535141192574-5d4897c13636?auto=format&fit=crop&q=80&w=600",
    customizable: false,
    nutrition: {
      calories: 440,
      allergens: ["Gluten", "Lácteos", "Huevo", "Frutos Secos"]
    },
    stock: 8
  },

  // BRUNCH & BREAKFAST (Tostados, Salados y Desayunos)
  {
    id: "arg-tostado-mixto",
    name: "Tostado Mixto en Pan de Miga",
    price: 6.90,
    description: "El inconfundible 'tostado' argentino de las cafeterías notables. Finas capas de pan de miga untadas con manteca, rellenas de abundante jamón cocido natural y queso dambo derretido a la plancha.",
    category: "brunch",
    tags: ["Recomendado"],
    image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=600",
    customizable: false,
    nutrition: {
      calories: 450,
      allergens: ["Gluten", "Lácteos"]
    },
    stock: 30
  },
  {
    id: "arg-tostado-carlitos",
    name: "Tostado 'Carlitos' con Salsa Golf",
    price: 7.20,
    description: "Homenaje al rey de la noche porteña: tostado de jamón y queso dambo en pan de miga doble, aderezado con un toque sutil de manteca y salsa golf criolla casera antes de pasar por la plancha caliente.",
    category: "brunch",
    tags: ["Especial"],
    image: "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&q=80&w=600",
    customizable: false,
    nutrition: {
      calories: 490,
      allergens: ["Gluten", "Lácteos", "Huevo"]
    },
    stock: 20
  },
  {
    id: "arg-empanada-carne",
    name: "Dúo de Empanadas de Carne Cortada a Cuchillo",
    price: 4.80,
    description: "Dos empanadas tradicionales jugosas rellenas de bola de lomo cortada a cuchillo, salteada con cebolla de verdeo, huevo duro picado, aceituna verde y el toque justo de pimentón dulce y comino.",
    category: "brunch",
    tags: ["Especial", "Artesanal"],
    image: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&q=80&w=600",
    customizable: true, // option to heat up
    nutrition: {
      calories: 380,
      allergens: ["Gluten", "Huevo"]
    },
    stock: 40
  },
  {
    id: "arg-empanada-jyq",
    name: "Dúo de Empanadas de Jamón y Queso Hojaldradas",
    price: 4.60,
    description: "Dos empanadas de masa de hojaldre casera rellenas con cubos de jamón cocido seleccionado y mezcla cremosa de quesos derretidos dambo y mozzarella.",
    category: "brunch",
    tags: ["Artesanal"],
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: {
      calories: 360,
      allergens: ["Gluten", "Lácteos"]
    },
    stock: 35
  },
  {
    id: "arg-pascualina",
    name: "Pascualina de Espinaca Notable",
    price: 5.50,
    description: "Porción de la clásica tarta alta hogareña, rellena de abundante espinaca fresca salteada con nuez moscada, ligada con queso parmesano y crema, con rodajas de huevo duro incrustadas en su interior.",
    category: "brunch",
    tags: ["Clásico"],
    image: "https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: {
      calories: 390,
      allergens: ["Gluten", "Lácteos", "Huevo"]
    },
    stock: 15
  },
  {
    id: "arg-tostadas-campo",
    name: "Tostadas de Campo con Queso y Dulce",
    price: 4.50,
    description: "Dos rebanadas gruesas de pan de campo casero de masa madre, tostadas a la leña, servidas con queso crema batido de campo y abundante dulce de leche repostero o mermelada patagónica.",
    category: "brunch",
    tags: ["Recomendado"],
    image: "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&q=80&w=600",
    customizable: false,
    nutrition: {
      calories: 360,
      allergens: ["Gluten", "Lácteos"]
    },
    stock: 25
  },

  // SPECIAL OFFERS & OFFERS DISPLAYED ON PAGE
  {
    id: "offer-promo-portena",
    name: "PROMO: Café con Leche + 3 Medialunas",
    price: 6.20,
    description: "El ritual porteño absoluto con precio promocional especial. Un tazón de café con leche clásico caliente acompañado de tres medialunas de manteca recién horneadas y pintadas con almíbar.",
    category: "coffee",
    tags: ["OFERTA", "Recomendado"],
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: {
      calories: 460,
      allergens: ["Gluten", "Lácteos", "Huevo"]
    },
    stock: 50,
    isOffer: true,
    offerPrice: 5.20 // Extra promo discount
  },
  {
    id: "offer-merienda-puglia",
    name: "OFERTA MERIENDA: Submarino + Alfajor de Maicena",
    price: 6.80,
    description: "El combo perfecto para entibiar el alma. Una taza de leche bien caliente con barra de chocolate Bariloche y un auténtico alfajor de maicena relleno de dulce de leche con coco.",
    category: "coffee",
    tags: ["OFERTA", "Especial"],
    image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: {
      calories: 550,
      allergens: ["Gluten", "Lácteos", "Huevo"]
    },
    stock: 25,
    isOffer: true,
    offerPrice: 5.90
  },
  {
    id: "offer-almuerzo-ejecutivo",
    name: "PROMO MEDIODÍA: Tostado Mixto + Mate Cocido Helado",
    price: 9.80,
    description: "Almuerzo rápido, clásico y porteño. Tostado de jamón y queso caliente en pan de miga extra fino de manteca acompañado de un refrescante vaso de mate cocido helado de menta y limón.",
    category: "brunch",
    tags: ["OFERTA"],
    image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=600",
    customizable: false,
    nutrition: {
      calories: 500,
      allergens: ["Gluten", "Lácteos"]
    },
    stock: 20,
    isOffer: true,
    offerPrice: 8.50
  },

  // RESTAURANT STARTERS (Entradas & Tapeos)
  {
    id: "rest-empanada-carne",
    name: "Empanada Criolla Cortada a Cuchillo",
    price: 3.50,
    takeawayPrice: 3.10,
    deliveryPrice: 3.90,
    description: "Receta tradicional salteña. Carne de lomo cortada a cuchillo, cebolla de verdeo, huevo duro y aceitunas, frita en grasa de pella crocante.",
    category: "starters",
    tags: ["Recomendado", "Artesanal"],
    image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: { calories: 240, allergens: ["Gluten"] },
    stock: 50,
    station: "cocina_caliente",
    recipe: [
      { ingredientId: "ins-carne-lomo", amount: 0.12 },
      { ingredientId: "ins-harina", amount: 0.05 }
    ]
  },
  {
    id: "rest-provolone-chapa",
    name: "Provolone Crocante a la Chapa",
    price: 7.90,
    takeawayPrice: 7.00,
    deliveryPrice: 8.90,
    description: "Queso provolone estacionado dorado a la chapa de hierro con ají molido, orégano de montaña y un hilo de aceite de oliva de girasoles.",
    category: "starters",
    tags: ["Especial", "Parrilla"],
    image: "https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: { calories: 380, allergens: ["Lácteos"] },
    stock: 30,
    station: "parrilla"
  },
  {
    id: "rest-rabas-mar",
    name: "Rabas Crocantes con Alioli de Limón",
    price: 11.50,
    takeawayPrice: 10.30,
    deliveryPrice: 12.90,
    description: "Anillos de calamar fresco rebozados en tempura de panko, servidos crujientes con alioli casero de ajos asados y gajos de limón criollo.",
    category: "starters",
    tags: ["Mar del Plata"],
    image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: { calories: 420, allergens: ["Mariscos", "Gluten"] },
    stock: 20,
    station: "cocina_caliente"
  },

  // RESTAURANT MAIN DISHES (Platos Principales)
  {
    id: "rest-bife-chorizo",
    name: "Bife de Chorizo Premium (350g) a las Brasas",
    price: 18.50,
    takeawayPrice: 16.50,
    deliveryPrice: 20.90,
    description: "Corte noble de ternera patagónica a la parrilla con leña de quebracho. Servido con chimichurri casero, sal marina en escamas y la guarnición a tu elección.",
    category: "mains",
    tags: ["Parrilla", "Destacado"],
    image: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: { calories: 650, allergens: [] },
    stock: 25,
    station: "parrilla",
    recipe: [
      { ingredientId: "ins-bife-chorizo", amount: 0.35 },
      { ingredientId: "ins-papas", amount: 0.25 }
    ]
  },
  {
    id: "rest-milanesa-napolitana",
    name: "Milanesa de Ternera Gigante a la Napolitana",
    price: 15.90,
    takeawayPrice: 14.20,
    deliveryPrice: 17.90,
    description: "Tradición pura argentina: milanesa dorada cubierta con salsa concassé de tomates frescos, jamón cocido de campo, queso mozzarella gratado y orégano.",
    category: "mains",
    tags: ["Minutas", "Favorito"],
    image: "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: { calories: 720, allergens: ["Gluten", "Lácteos"] },
    stock: 35,
    station: "cocina_caliente"
  },
  {
    id: "rest-sorrentinos-jamon-queso",
    name: "Sorrentinos Caseros de Jamón y Queso",
    price: 14.20,
    takeawayPrice: 12.80,
    deliveryPrice: 15.90,
    description: "Masa fresca elaborada con yemas de huevo de campo. Rellenos con jamón horneado artesanal y reggianito madurado. Servidos con salsa tuco o rosa.",
    category: "mains",
    tags: ["Pastas", "Artesanal"],
    image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: { calories: 580, allergens: ["Gluten", "Lácteos", "Huevo"] },
    stock: 30,
    station: "cocina_caliente"
  },
  {
    id: "rest-salmon-vegetales",
    name: "Salmón Rosado con Manteca de Hierbas y Vegetales",
    price: 21.00,
    takeawayPrice: 18.90,
    deliveryPrice: 23.50,
    description: "Medallón de salmón rosado sellado a la plancha con emulsión de manteca a las finas hierbas y acompañamiento de vegetales salteados al wok.",
    category: "mains",
    tags: ["Pesca", "Gourmet"],
    image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: { calories: 490, allergens: ["Pescado", "Lácteos"] },
    stock: 15,
    station: "cocina_caliente"
  },

  // RESTAURANT DESSERTS (Postres)
  {
    id: "rest-flan-mixto",
    name: "Flan Casero de Yemas con Dulce y Crema",
    price: 6.20,
    takeawayPrice: 5.50,
    deliveryPrice: 6.90,
    description: "Flan clásico elaborado con 8 yemas, leche entera batida y caramelo rubio. Acompañado de dulce de leche colonial y crema chantilly fresca.",
    category: "desserts",
    tags: ["Tradicional", "Postre"],
    image: "https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?auto=format&fit=crop&q=80&w=600",
    customizable: false,
    nutrition: { calories: 340, allergens: ["Lácteos", "Huevo"] },
    stock: 40,
    station: "cocina_fria"
  },
  {
    id: "rest-volcan-chocolate",
    name: "Volcán de Chocolate con Helado de Crema",
    price: 7.80,
    takeawayPrice: 7.00,
    deliveryPrice: 8.80,
    description: "Biscocho tibio de chocolate amargo 70% cacao con centro líquido derretido y una bocha de helado de crema americana pura.",
    category: "desserts",
    tags: ["Especial", "Chef"],
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&q=80&w=600",
    customizable: false,
    nutrition: { calories: 480, allergens: ["Gluten", "Lácteos", "Huevo"] },
    stock: 25,
    station: "cocina_fria"
  },
  {
    id: "rest-tiramisu-puglia",
    name: "Tiramisú Puglia al Mascarpone",
    price: 7.50,
    takeawayPrice: 6.70,
    deliveryPrice: 8.40,
    description: "Vainillas artesanales embebidas en café espresso corto y licor Amaretto, intercaladas con crema suave de mascarpone y espolvoreado de cacao amargo.",
    category: "desserts",
    tags: ["Italiano", "Recomendado"],
    image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&q=80&w=600",
    customizable: false,
    nutrition: { calories: 410, allergens: ["Gluten", "Lácteos", "Huevo"] },
    stock: 30,
    station: "cocina_fria"
  },

  // RESTAURANT DRINKS (Bebidas, Vinos & Coctelería)
  {
    id: "rest-vino-malbec-reserva",
    name: "Vino Malbec Don Pablo Reserva (750ml)",
    price: 19.50,
    takeawayPrice: 17.50,
    deliveryPrice: 21.90,
    description: "Malbec de la comarca de Luján de Cuyo con 12 meses de crianza en roble francés. Notas a ciruelas maduras, vainilla y taninos aterciopelados.",
    category: "drinks",
    tags: ["Vino", "Reserva"],
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=600",
    customizable: false,
    nutrition: { calories: 180, allergens: ["Sulfitos"] },
    stock: 50,
    station: "barra_tragos"
  },
  {
    id: "rest-aperol-spritz",
    name: "Coctel Aperol Spritz de Autor",
    price: 7.50,
    takeawayPrice: 6.80,
    deliveryPrice: 8.50,
    description: "El icónico aperitivo italiano: Aperol, espumante Prosecco extra dry, soda de sifón artesanal y media rodaja de naranja fresca con hielo de roca.",
    category: "drinks",
    tags: ["Coctelería", "Aperitivo"],
    image: "https://images.unsplash.com/photo-1560512823-829485b8bf24?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: { calories: 150, allergens: [] },
    stock: 60,
    station: "barra_tragos"
  },
  {
    id: "rest-cerveza-patagonia-ipa",
    name: "Cerveza Tirada Patagonia IPA (Pinta 500ml)",
    price: 5.50,
    takeawayPrice: 4.90,
    deliveryPrice: 6.20,
    description: "Cerveza tirada fría de barril artesanal con lúpulos patagónicos. Amargor característico con intensas notas cítricas y a frutos tropicales.",
    category: "drinks",
    tags: ["Cerveza Tirada"],
    image: "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&q=80&w=600",
    customizable: false,
    nutrition: { calories: 210, allergens: ["Gluten"] },
    stock: 100,
    station: "barra_tragos"
  },

  // EXECUTIVE MENU PACKAGE ITEM
  {
    id: "rest-menu-ejecutivo-combo",
    name: "⭐ Menú Ejecutivo del Día (Entrada + Principal + Bebida + Postre)",
    price: 8000,
    takeawayPrice: 7500,
    deliveryPrice: 8500,
    description: "La propuesta de almuerzo completo del día. Incluye Entrada seleccionada, Plato Principal con guarnición, Bebida fría/vino y Postre casero o café.",
    category: "executive",
    tags: ["PROMO ALMUERZO", "Menú del Día"],
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600",
    customizable: true,
    nutrition: { calories: 850, allergens: ["Gluten", "Lácteos", "Huevo"] },
    stock: 50,
    station: "cocina_caliente"
  }
];

export const TABLES_DATA: Table[] = [
  {
    id: "mesa-1",
    name: "Mesa Puglia",
    capacity: 2,
    type: "window",
    description: "Ubicada frente al gran ventanal de la Avenida 50, con vista a los tilos platenses. Ideal para parejas o lectores con luz natural abundante.",
    coordX: 18,
    coordY: 20,
    status: "Libre"
  },
  {
    id: "mesa-2",
    name: "Sofá Borges (Palermo)",
    capacity: 4,
    type: "sofa",
    description: "Cómodos sillones de cuero capitoné oscuro bajo la biblioteca del rincón de Borges. Un oasis literario súper cómodo y relajante.",
    coordX: 50,
    coordY: 25,
    status: "Libre"
  },
  {
    id: "mesa-3",
    name: "La Gran Recoleta",
    capacity: 6,
    type: "sofa",
    description: "Mesa señorial de roble antiguo recuperado de una casona de Recoleta, rodeada de sillas de pana. Ideal para familias o reuniones de café notables.",
    coordX: 50,
    coordY: 65,
    status: "Libre"
  },
  {
    id: "mesa-4",
    name: "Barra Caminito - Puesto 1",
    capacity: 1,
    type: "bar",
    description: "Frente a nuestra máquina de espresso de cobre pulido. Disfrutá de la charla con nuestros baristas y el perfume del grano recién molido.",
    coordX: 85,
    coordY: 15,
    status: "Libre"
  },
  {
    id: "mesa-5",
    name: "Barra Caminito - Puesto 2",
    capacity: 1,
    type: "bar",
    description: "Frente a la barra de filtrado manual. Charlá con nuestros baristas sobre perfiles de tostado patagónicos y cafés de origen único.",
    coordX: 85,
    coordY: 35,
    status: "Libre"
  },
  {
    id: "mesa-6",
    name: "Rincón de los Poetas",
    capacity: 2,
    type: "reading",
    description: "Espacio de lectura súper silencioso rodeado de estanterías de libros antiguos de literatura argentina, iluminado con una cálida lámpara retro.",
    coordX: 18,
    coordY: 70,
    status: "Libre"
  },
  {
    id: "mesa-7",
    name: "Patio de La Boca",
    capacity: 4,
    type: "terrace",
    description: "En nuestro patio trasero exterior, rodeado de macetas de barro con geranios coloridos, banderines porteños y guirnaldas de luces para la tarde.",
    coordX: 18,
    coordY: 45,
    status: "Libre"
  }
];

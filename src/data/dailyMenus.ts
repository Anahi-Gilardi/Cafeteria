import { DailyExecutiveMenu } from "../types";

export const DEFAULT_WEEKLY_MENUS: DailyExecutiveMenu[] = [
  {
    dayOfWeek: "Lunes",
    title: "Menú Tradicional de Cuchara & Bodegón",
    description: "Iniciá la semana con sabores reconfortantes de nuestra cocina criolla casera.",
    price: 12.50,
    starters: ["Sopa Crema de Calabaza y Crutones", "Empanada de Carne Cortada a Cuchillo", "Ensalada Verde de la Huerta"],
    mains: ["Guiso de Lentejas Criollo con Chorizo", "Pastel de Papa Tradicional Horneado", "Milanesa de Pechuga a la Parmigiana con Puré"],
    drinks: ["Copa de Vino Malbec de la Casa", "Limonada Fresca con Menta y Jengibre", "Agua Mineral / Gaseosa 500ml"],
    desserts: ["Flan Casero con Dulce de Leche", "Queso y Dulce (Vigilante)", "Café Espresso en Jarrito"],
    active: true
  },
  {
    dayOfWeek: "Martes",
    title: "Menú Minutas Porteñas Gourmet",
    description: "Clásicos inoxidables de las mejores minutas de Buenos Aires elaboradas al momento.",
    price: 12.50,
    starters: ["Provolone a la Chapa con Oreganato", "Empanada de Jamón y Queso Glaseada", "Bruschetta de Tomate Concasse y Albahaca"],
    mains: ["Milanesa Napolitana de Ternera con Papas Fritas", "Suprema Maryland con Choclo Cremoso", "Ensalada César Gourmet con Pollo Grillado"],
    drinks: ["Copa de Vino Cabernet Sauvignon", "Jugo Natural de Naranja Exprimido", "Agua Con / Sin Gas 500ml"],
    desserts: ["Panqueque con Dulce de Leche Caramelizado", "Bocha de Helado de Artesanal", "Café Cortado o Lágrima"],
    active: true
  },
  {
    dayOfWeek: "Miércoles",
    title: "Menú Especialidad Pastas Caseras",
    description: "Pastas amasaditas al huevo por nuestros maestros fideos con salsas italianas.",
    price: 13.00,
    starters: ["Caprese con Muzzarella de Búfala y Pesto", "Sopa Minestrone de Vegetales", "Focaccia Artesanal con Romero"],
    mains: ["Sorrentinos de Jamón y Queso con Salsa Tuco", "Ravioles de Espinaca y Ricota con Salsa Mixta", "Lasagna Bolognesa de la Casa"],
    drinks: ["Copa de Vino Chardonnay / Malbec", "Limonada de Arándanos y Romero", "Gaseosa / Agua Mineral"],
    desserts: ["Tiramisú Tradicional con Cacao Marplatense", "Ensalada de Frutas Estacionales", "Café Doble o Capuchino"],
    active: true
  },
  {
    dayOfWeek: "Jueves",
    title: "Menú Especial Parrilla & Cortes de Autor",
    description: "Nuestra selección de carnes a la parrilla con leña de quebracho y guarniciones de fuego.",
    price: 14.50,
    starters: ["Choripán de Campo con Chimichurri", "Empanada Salteña de Carne Picante", "Ensalada de Rúcula y Parmesano"],
    mains: ["Bife de Chorizo (250g) a las Brasas con Papas Provenzal", "Entraña Tiernizada a la Chapa", "Bondiola de Cerdo al Malbec con Puré de Batatas"],
    drinks: ["Copa de Vino Red Blend Reserva", "Cerveza Tirada Artesanal IPA / Rubia", "Agua Mineral / Gaseosa"],
    desserts: ["Volcán de Chocolate con Helado de Crema", "Flan Casero con Crema y Dulce de Leche", "Café de Especialidad"],
    active: true
  },
  {
    dayOfWeek: "Viernes",
    title: "Menú Pesca Fresca & Mar del Plata",
    description: "Platos frescos del mar seleccionados por nuestro chef para cerrar la semana hábil.",
    price: 14.00,
    starters: ["Rabitas Crocantes con Salsa Tartara", "Sopa de Mariscos al Vino Blanco", "Empanada de Humita y Queso"],
    mains: ["Filet de Merluza a la Romana con Puré Mixto", "Cazuela de Mariscos con Arroz Azafranado", "Salmon de Criadero al Horno con Vegetales Asados"],
    drinks: ["Copa de Vino Sauvignon Blanc", "Limonada de Hierbabuena", "Cerveza Tirada / Agua Mineral"],
    desserts: ["Crumble de Manzana con Helado", "Mousse de Chocolate Semiamargo", "Café o Té en Hebras"],
    active: true
  },
  {
    dayOfWeek: "Sábado",
    title: "Menú Bistró & Brunch de Fin de Semana",
    description: "Una experiencia gastronómica relajada para disfrutar el fin de semana en familia o amigos.",
    price: 15.00,
    starters: ["Tabla de Quesos y Fiambres Artesanales", "Empanada de Carne a la Leña", "Bruschetta de Salmón Ahumado"],
    mains: ["Ojo de Bife con Manteca de Hierbas y Papas Rústicas", "Risotto de Hongos Portobello y Trufa", "Raviolones de Cordero con Salsa de Hierbas"],
    drinks: ["Copa de Espumante o Vino Reserva", "Trago Aperol Spritz / Gin Tonic", "Jugo Exprimido / Agua Mineral"],
    desserts: ["Torta Marquesa de Chocolate", "Tiramisú Puglia", "Café de Especialidad Filtrado"],
    active: true
  },
  {
    dayOfWeek: "Domingo",
    title: "Menú Familiar Dominical & Asado Puglia",
    description: "La mesa de domingo servida con abundancia y cariño como en las casas pugliesas.",
    price: 15.00,
    starters: ["Chorizo y Morcilla de Campo", "Empanada de Carne Cortada a Cuchillo", "Provolone Fundido"],
    mains: ["Asado de Tira a la Parrilla con Ensalada Rusa", "Ñoquis de Papa Caseros con Estofado de Peceto", "Milanesa de Ternera Gigante a la Napolitana"],
    drinks: ["Copa de Vino Malbec Don Pablo", "Limonada con Jengibre y Miel", "Gaseosa / Agua Mineral"],
    desserts: ["Postre Balcarce Artesanal", "Flan Mixto Especial", "Café Espresso o Submarino"],
    active: true
  }
];

export function getTodayExecutiveMenu(): DailyExecutiveMenu {
  const days: DailyExecutiveMenu["dayOfWeek"][] = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado"
  ];
  const todayIndex = new Date().getDay();
  const dayName = days[todayIndex];

  try {
    const savedCustom = localStorage.getItem("puglia_custom_daily_menus");
    if (savedCustom) {
      const parsed: DailyExecutiveMenu[] = JSON.parse(savedCustom);
      const found = parsed.find((m) => m.dayOfWeek === dayName);
      if (found) return found;
    }
  } catch (e) {
    console.error("Error reading custom daily menus:", e);
  }

  return DEFAULT_WEEKLY_MENUS.find((m) => m.dayOfWeek === dayName) || DEFAULT_WEEKLY_MENUS[1];
}

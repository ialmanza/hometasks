export interface ExpenseIcon {
  emoji: string;
  name: string;
  category: string;
}

export const EXPENSE_ICONS: ExpenseIcon[] = [
  // Vivienda
  { emoji: '🏠', name: 'Casa', category: 'Vivienda' },
  { emoji: '🏢', name: 'Edificio', category: 'Vivienda' },
  { emoji: '🏡', name: 'Casa con jardín', category: 'Vivienda' },
  { emoji: '🏘️', name: 'Casas', category: 'Vivienda' },
  
  // Servicios
  { emoji: '💡', name: 'Luz', category: 'Servicios' },
  { emoji: '💧', name: 'Agua', category: 'Servicios' },
  { emoji: '🔥', name: 'Gas', category: 'Servicios' },
  { emoji: '📶', name: 'Internet', category: 'Servicios' },
  { emoji: '📺', name: 'TV', category: 'Servicios' },
  { emoji: '📱', name: 'Teléfono', category: 'Servicios' },
  
  // Compras y Alimentación
  { emoji: '🛒', name: 'Compras', category: 'Compras' },
  { emoji: '🍎', name: 'Frutas', category: 'Compras' },
  { emoji: '🥩', name: 'Carne', category: 'Compras' },
  { emoji: '🥖', name: 'Pan', category: 'Compras' },
  { emoji: '🥛', name: 'Lácteos', category: 'Compras' },
  { emoji: '🍕', name: 'Pizza', category: 'Compras' },
  { emoji: '☕', name: 'Café', category: 'Compras' },
  
  // Transporte
  { emoji: '🚗', name: 'Auto', category: 'Transporte' },
  { emoji: '🚌', name: 'Bus', category: 'Transporte' },
  { emoji: '🚇', name: 'Metro', category: 'Transporte' },
  { emoji: '🚲', name: 'Bicicleta', category: 'Transporte' },
  { emoji: '⛽', name: 'Gasolina', category: 'Transporte' },
  { emoji: '🛣️', name: 'Carretera', category: 'Transporte' },
  
  // Entretenimiento
  { emoji: '🎮', name: 'Videojuegos', category: 'Entretenimiento' },
  { emoji: '🎬', name: 'Películas', category: 'Entretenimiento' },
  { emoji: '🎵', name: 'Música', category: 'Entretenimiento' },
  { emoji: '📚', name: 'Libros', category: 'Entretenimiento' },
  { emoji: '🎨', name: 'Arte', category: 'Entretenimiento' },
  { emoji: '🎪', name: 'Entretenimiento', category: 'Entretenimiento' },
  
  // Salud
  { emoji: '💊', name: 'Medicinas', category: 'Salud' },
  { emoji: '🏥', name: 'Hospital', category: 'Salud' },
  { emoji: '👨‍⚕️', name: 'Doctor', category: 'Salud' },
  { emoji: '🦷', name: 'Dentista', category: 'Salud' },
  { emoji: '💉', name: 'Vacunas', category: 'Salud' },
  
  // Educación
  { emoji: '📚', name: 'Libros', category: 'Educación' },
  { emoji: '🎓', name: 'Universidad', category: 'Educación' },
  { emoji: '✏️', name: 'Lápiz', category: 'Educación' },
  { emoji: '🏫', name: 'Escuela', category: 'Educación' },
  
  // Seguros y Finanzas
  { emoji: '🛡️', name: 'Seguro', category: 'Finanzas' },
  { emoji: '💰', name: 'Dinero', category: 'Finanzas' },
  { emoji: '💳', name: 'Tarjeta', category: 'Finanzas' },
  { emoji: '🏦', name: 'Banco', category: 'Finanzas' },
  { emoji: '📊', name: 'Inversiones', category: 'Finanzas' },
  
  // Ropa y Personales
  { emoji: '👕', name: 'Ropa', category: 'Personales' },
  { emoji: '👟', name: 'Zapatos', category: 'Personales' },
  { emoji: '💄', name: 'Cosméticos', category: 'Personales' },
  { emoji: '✂️', name: 'Peluquería', category: 'Personales' },
  { emoji: '🛁', name: 'Higiene', category: 'Personales' },
  
  // Otros
  { emoji: '🎁', name: 'Regalos', category: 'Otros' },
  { emoji: '🛠️', name: 'Herramientas', category: 'Otros' },
  { emoji: '🧹', name: 'Limpieza', category: 'Otros' },
  { emoji: '🌱', name: 'Jardín', category: 'Otros' },
  { emoji: '🐕', name: 'Mascotas', category: 'Otros' },
  { emoji: '✈️', name: 'Viajes', category: 'Otros' },
  { emoji: '🏖️', name: 'Vacaciones', category: 'Otros' },
  { emoji: '🎉', name: 'Fiestas', category: 'Otros' },
  { emoji: '📦', name: 'Paquete', category: 'Otros' },
  { emoji: '❓', name: 'Otro', category: 'Otros' }
];

export const getIconByTitle = (title: string): string => {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('rent') || lowerTitle.includes('alquiler')) return '🏠';
  if (lowerTitle.includes('utilities') || lowerTitle.includes('servicios')) return '💡';
  if (lowerTitle.includes('groceries') || lowerTitle.includes('compras')) return '🛒';
  if (lowerTitle.includes('internet') || lowerTitle.includes('wifi')) return '📶';
  if (lowerTitle.includes('subscription') || lowerTitle.includes('suscripción')) return '📺';
  if (lowerTitle.includes('insurance') || lowerTitle.includes('seguro')) return '🛡️';
  if (lowerTitle.includes('transport') || lowerTitle.includes('transporte')) return '🚗';
  if (lowerTitle.includes('entertainment') || lowerTitle.includes('entretenimiento')) return '🎮';
  
  return '💰'; // Icono por defecto
}; 
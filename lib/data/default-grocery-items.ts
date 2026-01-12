// Default grocery items for NZ supermarkets
// These are common items with NZ English spelling and typical prices

export interface DefaultGroceryItem {
  name: string;
  category: string;
  averagePrice: number; // NZD
}

export const DEFAULT_GROCERY_ITEMS: DefaultGroceryItem[] = [
  // Produce
  { name: "Bananas", category: "Produce", averagePrice: 3.5 },
  { name: "Apples", category: "Produce", averagePrice: 4.0 },
  { name: "Oranges", category: "Produce", averagePrice: 5.0 },
  { name: "Avocados", category: "Produce", averagePrice: 3.0 },
  { name: "Tomatoes", category: "Produce", averagePrice: 6.0 },
  { name: "Lettuce", category: "Produce", averagePrice: 3.5 },
  { name: "Spinach", category: "Produce", averagePrice: 4.0 },
  { name: "Carrots", category: "Produce", averagePrice: 3.0 },
  { name: "Onions", category: "Produce", averagePrice: 4.0 },
  { name: "Potatoes", category: "Produce", averagePrice: 5.0 },
  { name: "Kumara", category: "Produce", averagePrice: 6.0 },
  { name: "Broccoli", category: "Produce", averagePrice: 4.5 },
  { name: "Capsicum", category: "Produce", averagePrice: 3.0 },
  { name: "Cucumber", category: "Produce", averagePrice: 2.5 },
  { name: "Mushrooms", category: "Produce", averagePrice: 5.0 },
  { name: "Garlic", category: "Produce", averagePrice: 2.0 },
  { name: "Ginger", category: "Produce", averagePrice: 3.0 },
  { name: "Lemons", category: "Produce", averagePrice: 2.0 },
  { name: "Limes", category: "Produce", averagePrice: 1.5 },
  { name: "Courgette", category: "Produce", averagePrice: 3.5 },
  { name: "Pumpkin", category: "Produce", averagePrice: 4.0 },
  { name: "Spring onions", category: "Produce", averagePrice: 2.5 },
  { name: "Celery", category: "Produce", averagePrice: 4.0 },
  { name: "Corn on the cob", category: "Produce", averagePrice: 3.0 },
  { name: "Grapes", category: "Produce", averagePrice: 6.0 },
  { name: "Kiwifruit", category: "Produce", averagePrice: 4.0 },
  { name: "Mandarins", category: "Produce", averagePrice: 5.0 },
  { name: "Strawberries", category: "Produce", averagePrice: 5.0 },
  { name: "Blueberries", category: "Produce", averagePrice: 6.0 },

  // Dairy
  { name: "Milk (2L)", category: "Dairy", averagePrice: 4.5 },
  { name: "Milk (1L)", category: "Dairy", averagePrice: 3.0 },
  { name: "Butter", category: "Dairy", averagePrice: 6.0 },
  { name: "Cheese (block)", category: "Dairy", averagePrice: 10.0 },
  { name: "Cheese (sliced)", category: "Dairy", averagePrice: 6.0 },
  { name: "Cream cheese", category: "Dairy", averagePrice: 5.0 },
  { name: "Sour cream", category: "Dairy", averagePrice: 4.0 },
  { name: "Yoghurt", category: "Dairy", averagePrice: 5.0 },
  { name: "Greek yoghurt", category: "Dairy", averagePrice: 6.0 },
  { name: "Eggs (dozen)", category: "Dairy", averagePrice: 8.0 },
  { name: "Eggs (half dozen)", category: "Dairy", averagePrice: 5.0 },
  { name: "Cream (300ml)", category: "Dairy", averagePrice: 4.5 },
  { name: "Cottage cheese", category: "Dairy", averagePrice: 5.0 },
  { name: "Parmesan", category: "Dairy", averagePrice: 8.0 },
  { name: "Mozzarella", category: "Dairy", averagePrice: 6.0 },
  { name: "Feta", category: "Dairy", averagePrice: 7.0 },

  // Meat
  { name: "Chicken breast", category: "Meat", averagePrice: 14.0 },
  { name: "Chicken thighs", category: "Meat", averagePrice: 10.0 },
  { name: "Chicken drumsticks", category: "Meat", averagePrice: 8.0 },
  { name: "Mince (beef)", category: "Meat", averagePrice: 12.0 },
  { name: "Mince (lamb)", category: "Meat", averagePrice: 14.0 },
  { name: "Beef steak", category: "Meat", averagePrice: 22.0 },
  { name: "Lamb chops", category: "Meat", averagePrice: 18.0 },
  { name: "Pork chops", category: "Meat", averagePrice: 14.0 },
  { name: "Bacon", category: "Meat", averagePrice: 8.0 },
  { name: "Sausages", category: "Meat", averagePrice: 10.0 },
  { name: "Ham (sliced)", category: "Meat", averagePrice: 6.0 },
  { name: "Salami", category: "Meat", averagePrice: 7.0 },
  { name: "Roast chicken", category: "Meat", averagePrice: 12.0 },

  // Seafood
  { name: "Salmon fillets", category: "Seafood", averagePrice: 18.0 },
  { name: "Fish fillets", category: "Seafood", averagePrice: 14.0 },
  { name: "Prawns", category: "Seafood", averagePrice: 20.0 },
  { name: "Mussels", category: "Seafood", averagePrice: 8.0 },
  { name: "Canned tuna", category: "Seafood", averagePrice: 3.5 },
  { name: "Smoked salmon", category: "Seafood", averagePrice: 12.0 },

  // Bakery
  { name: "Bread (loaf)", category: "Bakery", averagePrice: 4.0 },
  { name: "Bread rolls", category: "Bakery", averagePrice: 4.0 },
  { name: "Bagels", category: "Bakery", averagePrice: 5.0 },
  { name: "Croissants", category: "Bakery", averagePrice: 5.0 },
  { name: "Muffins", category: "Bakery", averagePrice: 5.0 },
  { name: "Wraps", category: "Bakery", averagePrice: 5.0 },
  { name: "Pita bread", category: "Bakery", averagePrice: 4.0 },
  { name: "Crumpets", category: "Bakery", averagePrice: 4.0 },
  { name: "English muffins", category: "Bakery", averagePrice: 4.5 },
  { name: "Hot cross buns", category: "Bakery", averagePrice: 5.0 },
  { name: "Sourdough", category: "Bakery", averagePrice: 6.0 },

  // Frozen
  { name: "Frozen peas", category: "Frozen", averagePrice: 4.0 },
  { name: "Frozen corn", category: "Frozen", averagePrice: 4.0 },
  { name: "Frozen mixed veg", category: "Frozen", averagePrice: 5.0 },
  { name: "Frozen chips", category: "Frozen", averagePrice: 5.0 },
  { name: "Fish fingers", category: "Frozen", averagePrice: 7.0 },
  { name: "Chicken nuggets", category: "Frozen", averagePrice: 8.0 },
  { name: "Ice cream (2L)", category: "Frozen", averagePrice: 8.0 },
  { name: "Frozen pizza", category: "Frozen", averagePrice: 7.0 },
  { name: "Frozen berries", category: "Frozen", averagePrice: 8.0 },
  { name: "Frozen pastry", category: "Frozen", averagePrice: 6.0 },

  // Pantry
  { name: "Rice (1kg)", category: "Pantry", averagePrice: 4.0 },
  { name: "Pasta", category: "Pantry", averagePrice: 3.0 },
  { name: "Noodles", category: "Pantry", averagePrice: 3.5 },
  { name: "Flour", category: "Pantry", averagePrice: 3.0 },
  { name: "Sugar", category: "Pantry", averagePrice: 3.5 },
  { name: "Olive oil", category: "Pantry", averagePrice: 10.0 },
  { name: "Vegetable oil", category: "Pantry", averagePrice: 5.0 },
  { name: "Tinned tomatoes", category: "Pantry", averagePrice: 2.5 },
  { name: "Tomato paste", category: "Pantry", averagePrice: 3.0 },
  { name: "Baked beans", category: "Pantry", averagePrice: 2.5 },
  { name: "Chickpeas", category: "Pantry", averagePrice: 2.5 },
  { name: "Kidney beans", category: "Pantry", averagePrice: 2.5 },
  { name: "Lentils", category: "Pantry", averagePrice: 4.0 },
  { name: "Coconut milk", category: "Pantry", averagePrice: 3.0 },
  { name: "Soy sauce", category: "Pantry", averagePrice: 4.0 },
  { name: "Tomato sauce", category: "Pantry", averagePrice: 4.0 },
  { name: "BBQ sauce", category: "Pantry", averagePrice: 4.5 },
  { name: "Mayonnaise", category: "Pantry", averagePrice: 5.0 },
  { name: "Mustard", category: "Pantry", averagePrice: 4.0 },
  { name: "Vinegar", category: "Pantry", averagePrice: 3.5 },
  { name: "Stock cubes", category: "Pantry", averagePrice: 3.0 },
  { name: "Salt", category: "Pantry", averagePrice: 2.0 },
  { name: "Pepper", category: "Pantry", averagePrice: 4.0 },
  { name: "Mixed herbs", category: "Pantry", averagePrice: 4.0 },
  { name: "Honey", category: "Pantry", averagePrice: 8.0 },
  { name: "Peanut butter", category: "Pantry", averagePrice: 5.0 },
  { name: "Jam", category: "Pantry", averagePrice: 4.0 },
  { name: "Vegemite", category: "Pantry", averagePrice: 6.0 },
  { name: "Marmite", category: "Pantry", averagePrice: 6.0 },
  { name: "Nutella", category: "Pantry", averagePrice: 7.0 },

  // Breakfast
  { name: "Cereal", category: "Breakfast", averagePrice: 6.0 },
  { name: "Muesli", category: "Breakfast", averagePrice: 7.0 },
  { name: "Porridge oats", category: "Breakfast", averagePrice: 5.0 },
  { name: "Weet-Bix", category: "Breakfast", averagePrice: 5.0 },
  { name: "Cornflakes", category: "Breakfast", averagePrice: 5.0 },

  // Beverages
  { name: "Coffee", category: "Beverages", averagePrice: 10.0 },
  { name: "Tea bags", category: "Beverages", averagePrice: 6.0 },
  { name: "Orange juice", category: "Beverages", averagePrice: 5.0 },
  { name: "Apple juice", category: "Beverages", averagePrice: 5.0 },
  { name: "Soft drink", category: "Beverages", averagePrice: 3.5 },
  { name: "Sparkling water", category: "Beverages", averagePrice: 3.0 },
  { name: "Cordial", category: "Beverages", averagePrice: 4.0 },
  { name: "Sports drink", category: "Beverages", averagePrice: 4.0 },
  { name: "Energy drink", category: "Beverages", averagePrice: 4.0 },

  // Snacks
  { name: "Chips (crisps)", category: "Snacks", averagePrice: 4.0 },
  { name: "Biscuits", category: "Snacks", averagePrice: 4.0 },
  { name: "Chocolate", category: "Snacks", averagePrice: 5.0 },
  { name: "Crackers", category: "Snacks", averagePrice: 4.0 },
  { name: "Nuts", category: "Snacks", averagePrice: 7.0 },
  { name: "Muesli bars", category: "Snacks", averagePrice: 5.0 },
  { name: "Popcorn", category: "Snacks", averagePrice: 4.0 },
  { name: "Rice crackers", category: "Snacks", averagePrice: 4.0 },
  { name: "Dried fruit", category: "Snacks", averagePrice: 5.0 },
  { name: "Lollies", category: "Snacks", averagePrice: 4.0 },

  // Household
  { name: "Toilet paper", category: "Household", averagePrice: 10.0 },
  { name: "Paper towels", category: "Household", averagePrice: 5.0 },
  { name: "Tissues", category: "Household", averagePrice: 4.0 },
  { name: "Dishwashing liquid", category: "Household", averagePrice: 5.0 },
  { name: "Laundry powder", category: "Household", averagePrice: 15.0 },
  { name: "Laundry liquid", category: "Household", averagePrice: 12.0 },
  { name: "Fabric softener", category: "Household", averagePrice: 8.0 },
  { name: "Surface cleaner", category: "Household", averagePrice: 5.0 },
  { name: "Bathroom cleaner", category: "Household", averagePrice: 6.0 },
  { name: "Bleach", category: "Household", averagePrice: 4.0 },
  { name: "Rubbish bags", category: "Household", averagePrice: 8.0 },
  { name: "Glad wrap", category: "Household", averagePrice: 5.0 },
  { name: "Aluminium foil", category: "Household", averagePrice: 5.0 },
  { name: "Baking paper", category: "Household", averagePrice: 4.0 },
  { name: "Sponges", category: "Household", averagePrice: 4.0 },

  // Health & Beauty
  { name: "Shampoo", category: "Health & Beauty", averagePrice: 8.0 },
  { name: "Conditioner", category: "Health & Beauty", averagePrice: 8.0 },
  { name: "Body wash", category: "Health & Beauty", averagePrice: 7.0 },
  { name: "Soap", category: "Health & Beauty", averagePrice: 4.0 },
  { name: "Toothpaste", category: "Health & Beauty", averagePrice: 5.0 },
  { name: "Toothbrush", category: "Health & Beauty", averagePrice: 4.0 },
  { name: "Deodorant", category: "Health & Beauty", averagePrice: 6.0 },
  { name: "Sunscreen", category: "Health & Beauty", averagePrice: 15.0 },
  { name: "Moisturiser", category: "Health & Beauty", averagePrice: 10.0 },
  { name: "Razors", category: "Health & Beauty", averagePrice: 12.0 },
  { name: "Panadol", category: "Health & Beauty", averagePrice: 8.0 },
  { name: "Plasters", category: "Health & Beauty", averagePrice: 5.0 },

  // Baby
  { name: "Nappies", category: "Baby", averagePrice: 20.0 },
  { name: "Baby wipes", category: "Baby", averagePrice: 6.0 },
  { name: "Baby formula", category: "Baby", averagePrice: 25.0 },
  { name: "Baby food", category: "Baby", averagePrice: 3.0 },

  // Pet
  { name: "Dog food", category: "Pet", averagePrice: 15.0 },
  { name: "Cat food", category: "Pet", averagePrice: 12.0 },
  { name: "Cat litter", category: "Pet", averagePrice: 15.0 },
  { name: "Pet treats", category: "Pet", averagePrice: 8.0 },
];

// Get unique categories
export const GROCERY_CATEGORIES = [...new Set(DEFAULT_GROCERY_ITEMS.map(item => item.category))];

// Helper to search items
export function searchGroceryItems(query: string): DefaultGroceryItem[] {
  const lowerQuery = query.toLowerCase();
  return DEFAULT_GROCERY_ITEMS.filter(item =>
    item.name.toLowerCase().includes(lowerQuery)
  ).slice(0, 10);
}

// Helper to get items by category
export function getItemsByCategory(category: string): DefaultGroceryItem[] {
  return DEFAULT_GROCERY_ITEMS.filter(item => item.category === category);
}

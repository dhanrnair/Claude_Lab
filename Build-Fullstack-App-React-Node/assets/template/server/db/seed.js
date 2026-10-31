// Seed data. setup-db inserts with ON CONFLICT DO NOTHING, so editing a row
// here does NOT update a row that already exists in the database.
export const resources = [
  { id: 'r1', name: 'Example one', category: 'General', description: 'Replace this with real data for your domain.', image: '⭐' },
  { id: 'r2', name: 'Example two', category: 'General', description: 'Another placeholder row.', image: '🔷' },
];

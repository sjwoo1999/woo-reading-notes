#!/usr/bin/env node

/**
 * Database Seeding Script
 *
 * Usage:
 *   npx ts-node scripts/db/seed.ts
 *
 * Generates fake data for development and testing.
 * Idempotent: Safe to run multiple times (will not create duplicates)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Sample data
const sampleBooks = [
  {
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    publisher: 'Charles Scribner\'s Sons',
    published_year: 1925,
    isbn: '9780743273565',
    rating: 5,
    progress: 100,
    summary: 'A classic novel about the American Dream in the Jazz Age.',
  },
  {
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    publisher: 'J. B. Lippincott',
    published_year: 1960,
    isbn: '9780060935467',
    rating: 5,
    progress: 100,
    summary: 'An American classic addressing race and morality in the Deep South.',
  },
  {
    title: '1984',
    author: 'George Orwell',
    publisher: 'Secker & Warburg',
    published_year: 1949,
    isbn: '9780451524935',
    rating: 4,
    progress: 75,
    summary: 'A dystopian novel set in a totalitarian society.',
  },
  {
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    publisher: 'T. Egerton',
    published_year: 1813,
    isbn: '9780141439518',
    rating: 4,
    progress: 50,
    summary: 'A romantic novel of manners in Georgian England.',
  },
  {
    title: 'The Catcher in the Rye',
    author: 'J. D. Salinger',
    publisher: 'Little, Brown and Company',
    published_year: 1951,
    isbn: '9780316769174',
    rating: 3,
    progress: 25,
    summary: 'A coming-of-age novel narrated by Holden Caulfield.',
  },
];

const sampleTags = [
  { name: 'fiction' },
  { name: 'classic' },
  { name: 'american-literature' },
  { name: 'dystopian' },
  { name: 'romance' },
  { name: 'coming-of-age' },
  { name: 'social-commentary' },
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Create a test user (using service key)
    console.log('📝 Creating test user...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        name: 'Test User',
      },
    });

    if (authError) {
      // User might already exist, which is fine for idempotent seeding
      if (!authError.message.includes('already exists')) {
        throw authError;
      }
      console.log('⏭️  Test user already exists');

      // Get existing user
      const { data: users } = await supabase.auth.admin.listUsers();
      const existingUser = users?.users?.find((u) => u.email === 'test@example.com');
      if (!existingUser) {
        throw new Error('Cannot find or create test user');
      }
    } else {
      console.log('✅ Test user created:', authUser?.user?.email);
    }

    // Get the test user ID
    const { data: users } = await supabase.auth.admin.listUsers();
    const testUser = users?.users?.find((u) => u.email === 'test@example.com');
    const userId = testUser?.id;

    if (!userId) {
      throw new Error('Cannot determine test user ID');
    }

    // Create profile
    console.log('\n👤 Creating user profile...');
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: 'Test User',
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      throw profileError;
    }
    console.log('✅ Profile created/updated');

    // Create tags
    console.log('\n🏷️  Creating tags...');
    for (const tag of sampleTags) {
      const { error: tagError } = await supabase.from('tags').upsert({
        user_id: userId,
        name: tag.name,
        updated_at: new Date().toISOString(),
      });

      if (tagError && !tagError.message.includes('unique')) {
        throw tagError;
      }
    }
    console.log(`✅ ${sampleTags.length} tags created/verified`);

    // Create books
    console.log('\n📚 Creating sample books...');
    for (const book of sampleBooks) {
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .insert({
          user_id: userId,
          title: book.title,
          author: book.author,
          publisher: book.publisher,
          published_year: book.published_year,
          isbn: book.isbn,
          rating: book.rating,
          progress: book.progress,
          summary: book.summary,
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (bookError) {
        console.warn(`⚠️  Could not insert ${book.title}:`, bookError.message);
        continue;
      }

      if (bookData) {
        console.log(`✅ ${book.title}`);

        // Add tags to book (randomly select 2-3 tags)
        const selectedTags = sampleTags.sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 2) + 2);

        for (const tag of selectedTags) {
          const { data: tagData } = await supabase.from('tags').select('id').eq('user_id', userId).eq('name', tag.name).single();

          if (tagData) {
            await supabase.from('book_tags').insert({
              book_id: bookData.id,
              tag_id: tagData.id,
            });
          }
        }
      }
    }

    // Create sample notes
    console.log('\n📝 Creating sample notes...');
    const { data: books } = await supabase.from('books').select('id').eq('user_id', userId);

    if (books && books.length > 0) {
      const sampleNotes = [
        {
          title: 'Key Quote',
          content: 'This passage perfectly captures the essence of the protagonist\'s internal conflict.',
          location: 'Chapter 3, Page 42',
        },
        {
          title: 'Theme Analysis',
          content: 'The recurring motif of green light symbolizes unattainable dreams and hopes.',
          location: 'Chapter 5',
        },
        {
          title: 'Character Development',
          content: 'Notice how the character grows throughout the narrative, from naïve to experienced.',
          location: 'Throughout book',
        },
      ];

      for (const book of books.slice(0, 2)) {
        for (const note of sampleNotes) {
          const { error: noteError } = await supabase.from('notes').insert({
            user_id: userId,
            book_id: book.id,
            title: note.title,
            content: note.content,
            location: note.location,
            highlight_color: ['yellow', 'green', 'blue'][Math.floor(Math.random() * 3)],
            updated_at: new Date().toISOString(),
          });

          if (noteError) {
            console.warn(`⚠️  Could not insert note: ${noteError.message}`);
          }
        }
      }
    }
    console.log('✅ Sample notes created');

    // Create sample entities
    console.log('\n🔗 Creating sample entities...');
    const entities = [
      { name: 'American Dream', type: 'concept', description: 'Central theme in American literature' },
      { name: 'Jazz Age', type: 'period', description: 'Cultural period in 1920s USA' },
      { name: 'Totalitarianism', type: 'concept', description: 'System of government with absolute control' },
    ];

    for (const entity of entities) {
      const { error: entityError } = await supabase.from('entities').insert({
        user_id: userId,
        name: entity.name,
        type: entity.type,
        description: entity.description,
        updated_at: new Date().toISOString(),
      });

      if (entityError && !entityError.message.includes('unique')) {
        console.warn(`⚠️  Could not insert entity: ${entityError.message}`);
      } else {
        console.log(`✅ ${entity.name}`);
      }
    }

    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('📧 Test account:');
    console.log('   Email: test@example.com');
    console.log('   Password: TestPassword123!');
    console.log('\n💡 You can now log in and see the seeded data.');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

seedDatabase();

require('dotenv').config();
const bcrypt = require('bcryptjs');
const https = require('https');
const db = require('../db');
const { uploadImage } = require('../lib/cloudinary');

async function fetchImageBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function seed() {
  const email = 'guy@centerstage.lu';
  const password = 'CenterStage2024!';
  const slug = 'guy-benzeno';

  // Delete existing if re-running
  const existing = await db.query(`
    SELECT u.id FROM users u
    JOIN cards c ON c.user_id = u.id
    WHERE c.slug = $1
  `, [slug]);
  if (existing.rows[0]) {
    await db.query('DELETE FROM users WHERE id=$1', [existing.rows[0].id]);
    console.log('✓ Removed existing card');
  }

  // Create user
  const hash = await bcrypt.hash(password, 10);
  const userResult = await db.query(
    'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
    [email, hash, 'client']
  );
  const userId = userResult.rows[0].id;
  console.log('✓ Created user:', email);

  const phones = [{ label: 'Mobile', value: '+352 621 613 726', whatsapp: true }];
  const emails = [
    { label: 'Coaching', value: 'guy@centerstage.lu' },
    { label: 'Moderation', value: 'guy@moderateur.lu' }
  ];
  const websites = [
    { label: 'Center Stage', value: 'https://www.centerstage.lu' },
    { label: 'Guy Benzeno', value: 'https://www.guybenzeno.com' },
    { label: 'Moderateur', value: 'https://www.moderateur.lu' },
    { label: 'Cérémonie Laïque', value: 'https://www.ceremonie-laique.lu' }
  ];

  // Create card
  const cardResult = await db.query(`
    INSERT INTO cards (
      user_id, slug, name, title, company,
      location, linkedin, instagram,
      brand_name, brand_tagline, is_published,
      emails, phones, websites,
      primary_color, secondary_color, bg_color_start, bg_color_end, accent_bar_color,
      light_theme, logo_size
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
    RETURNING id
  `, [
    userId, slug,
    'Guy Benzeno',
    'Public Speaking Coach & MC',
    'Center Stage',
    'Luxembourg',
    'https://www.linkedin.com/in/guybenzeno/',
    'https://www.instagram.com/centerstage.lu/',
    'Center Stage',
    'Speak. Lead. Inspire.',
    true,
    JSON.stringify(emails),
    JSON.stringify(phones),
    JSON.stringify(websites),
    '#5bbfb5',   // mint teal accent
    '#1a1a1a',   // secondary (dark)
    '#ffffff',   // bg top: white
    '#f5faf9',   // bg bottom: very light mint
    '#1a1a1a',   // accent bar: black
    true,        // light_theme
    100          // logo_size
  ]);

  const cardId = cardResult.rows[0].id;
  console.log('✓ Created card:', slug, '(id:', cardId + ')');

  // Upload headshot
  console.log('⬆ Uploading headshot...');
  try {
    const headshotUrl = 'https://images.squarespace-cdn.com/content/v1/64df94bdde560f0400354ec5/3ff9669f-6580-4248-b1e9-2a84ef0d6b12/MDD_6758.jpg';
    const buffer = await fetchImageBuffer(headshotUrl);
    const url = await uploadImage(buffer, 'business-cards/headshots', `headshot-${cardId}`);
    await db.query('UPDATE cards SET headshot_url=$1 WHERE id=$2', [url, cardId]);
    console.log('✓ Headshot uploaded:', url);
  } catch (err) {
    console.warn('⚠ Headshot upload failed:', err.message);
  }

  // Upload logo
  console.log('⬆ Uploading Center Stage logo...');
  try {
    const logoUrl = 'https://images.squarespace-cdn.com/content/v1/5bd724277980b3038565d23c/fd61df6d-d755-4214-83b6-1e53041a4762/2025+Logo+Design-Main.png';
    const buffer = await fetchImageBuffer(logoUrl);
    const url = await uploadImage(buffer, 'business-cards/logos', `logo-${cardId}`);
    await db.query('UPDATE cards SET logo_url=$1, logo_invert=$2 WHERE id=$3', [url, '', cardId]);
    console.log('✓ Logo uploaded:', url);
  } catch (err) {
    console.warn('⚠ Logo upload failed:', err.message);
  }

  console.log('\n✅ Done! Card available at: /guy-benzeno');
  console.log('   Login: guy@centerstage.lu / CenterStage2024!');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });

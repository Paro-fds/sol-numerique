require('dotenv').config();
const s3Service = require('./src/services/s3Service');
const logger = require('./src/utils/logger');

async function testS3URL() {
  console.log('\n🔍 Testing S3 URL Generation\n');
  
  // 1. Vérifier la configuration
  console.log('📋 Configuration:');
  console.log('  useS3:', s3Service.useS3);
  console.log('  bucket:', s3Service.bucketName || 'NOT SET');
  console.log('  region:', s3Service.region || 'NOT SET');
  console.log('  AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
  console.log('  AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
  console.log('');

  if (!s3Service.useS3) {
    console.error('❌ S3 is NOT enabled!');
    console.error('   Check your .env file');
    return;
  }

  // 2. Tester la génération d'URL
  const testFilename = 'receipts/1761102028572-0ddb64161ac436c4-cc.png';
  
  try {
    console.log('🔗 Generating signed URL for:', testFilename);
    const url = await s3Service.getSignedViewUrl(testFilename, 3600);
    
    console.log('✅ URL generated successfully!');
    console.log('📍 URL:', url);
    console.log('');
    console.log('🧪 Test this URL in your browser:');
    console.log(url);
    
  } catch (error) {
    console.error('❌ Failed to generate URL:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.Code);
  }
}

testS3URL();
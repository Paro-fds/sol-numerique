const db = require('../src/config/database');
const transferService = require('../src/services/transferService');

async function initAllSols() {
  try {
    console.log('🔄 Initialisation des transferts...');
    
    // Récupérer tous les Sols actifs
    const sols = await db.executeQuery(
      'SELECT id, nom FROM sols WHERE statut = ?',
      ['actif']
    );
    
    console.log(`📊 ${sols.length} Sols trouvés`);
    
    for (const sol of sols) {
      try {
        console.log(`\n🔄 Sol: ${sol.nom} (ID: ${sol.id})`);
        await transferService.initializeTransfersForSol(sol.id);
        console.log(`✅ Initialisé avec succès`);
      } catch (error) {
        console.error(`❌ Erreur pour Sol ${sol.id}:`, error.message);
      }
    }
    
    console.log('\n🎉 Terminé !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

initAllSols();
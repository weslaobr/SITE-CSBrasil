require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function deploy() {
  const token = process.env.DISCLOUD_API_TOKEN;
  if (!token) {
    console.error('❌ Erro: DISCLOUD_API_TOKEN não encontrada no .env');
    process.exit(1);
  }

  const backendDir = path.join(__dirname, '../backend');
  const zipPath = path.join(__dirname, '../backend_deploy.zip');
  const configPath = path.join(backendDir, 'discloud.config');

  if (!fs.existsSync(configPath)) {
    console.error('❌ Erro: backend/discloud.config não encontrado');
    process.exit(1);
  }

  // Ler o nome da aplicação do config
  const configContent = fs.readFileSync(configPath, 'utf8');
  const appNameMatch = configContent.match(/NAME=(.+)/);
  const appName = appNameMatch ? appNameMatch[1].trim() : null;

  if (!appName) {
    console.error('❌ Erro: NAME não definido em discloud.config');
    process.exit(1);
  }

  console.log(`🚀 Iniciando deploy para a aplicação: ${appName}...`);

  try {
    // 1. Obter a lista de apps para pegar o ID correto
    console.log('🔍 Buscando ID da aplicação no Discloud...');
    const listRes = await fetch('https://api.discloud.app/v2/user', {
      headers: { 'api-token': token }
    });
    const listData = await listRes.json();

    if (listData.status !== 'ok') {
        throw new Error(`Erro ao listar apps: ${listData.message}`);
    }

    const app = listData.user.apps.find(a => a.name === appName || a.id === appName);
    if (!app) {
      console.error(`❌ Erro: Aplicação '${appName}' não encontrada no seu Discloud.`);
      console.log('Aplicações disponíveis:', listData.user.apps.map(a => `${a.name} (${a.id})`).join(', '));
      process.exit(1);
    }

    const appId = app.id;
    console.log(`✅ ID encontrado: ${appId}`);

    // 2. Criar o ZIP (usando PowerShell no Windows)
    console.log('📦 Criando arquivo ZIP do backend...');
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    
    // Comando PowerShell para zipar
    // Importante: Compress-Archive pode falhar se o arquivo já existir, por isso o unlink acima.
    const zipCommand = `powershell -Command "Compress-Archive -Path '${backendDir}\\*' -DestinationPath '${zipPath}' -Force"`;
    execSync(zipCommand);
    console.log('✅ ZIP criado com sucesso.');

    // 3. Fazer o Upload (Commit)
    console.log('📤 Enviando para o Discloud...');
    
    const fileBuffer = fs.readFileSync(zipPath);
    const blob = new Blob([fileBuffer], { type: 'application/zip' });
    const formData = new FormData();
    formData.append('file', blob, 'backend.zip');

    const uploadRes = await fetch(`https://api.discloud.app/v2/app/${appId}/commit`, {
      method: 'PUT',
      headers: {
        'api-token': token
      },
      body: formData
    });

    const uploadData = await uploadRes.json();

    if (uploadData.status === 'ok') {
      console.log('✨ Deploy realizado com sucesso!');
      console.log(`📝 Mensagem: ${uploadData.message}`);
    } else {
      console.error('❌ Erro no deploy:', uploadData);
    }

  } catch (error) {
    console.error('❌ Erro durante o deploy:');
    console.error(error.message);
  } finally {
    // Limpar o zip temporário
    if (fs.existsSync(zipPath)) {
      try {
          fs.unlinkSync(zipPath);
          console.log('🧹 Arquivo temporário removido.');
      } catch (e) {}
    }
  }
}

deploy();

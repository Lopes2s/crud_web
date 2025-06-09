const express = require('express');
const mysql2 = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/imagens', express.static(path.join(__dirname, 'imagens')));

// Configuração do banco de dados para XAMPP
const configBancoDados = {
    host: 'localhost',
    user: 'root', // Usuário padrão do XAMPP
    password: '',  // Senha padrão do XAMPP (vazio por padrão)
    database: 'escola_db'
};

// Configuração do Multer para upload de imagens
const armazenamento = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'imagens/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: armazenamento,
    fileFilter: (req, file, cb) => {
        const tiposPermitidos = /jpeg|jpg|png/;
        const extensao = tiposPermitidos.test(path.extname(file.originalname).toLowerCase());
        const tipoMime = tiposPermitidos.test(file.mimetype);
        
        if (extensao && tipoMime) {
            return cb(null, true);
        }
        cb('Erro: Apenas imagens JPEG ou PNG são permitidas!');
    }
});

// Conexão com o banco de dados
async function obterConexaoBanco() {
    return await mysql2.createConnection(configBancoDados);
}

// Rotas CRUD
// Criar
app.post('/api/estudantes', upload.single('foto'), async (req, res) => {
    try {
        const { nome, email, data_nascimento } = req.body;
        const foto = req.file ? req.file.filename : null;
        
        const conexao = await obterConexaoBanco();
        const [resultado] = await conexao.execute(
            'INSERT INTO estudantes (nome, email, data_nascimento, foto) VALUES (?, ?, ?, ?)',
            [nome, email, data_nascimento, foto]
        );
        await conexao.end();
        
        res.status(201).json({ id: resultado.insertId, nome, email, data_nascimento, foto });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao criar estudante' });
    }
});

// Ler - Listar todos
app.get('/api/estudantes', async (req, res) => {
    try {
        const conexao = await obterConexaoBanco();
        const [linhas] = await conexao.execute('SELECT * FROM estudantes');
        await conexao.end();
        
        res.json(linhas);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao listar estudantes' });
    }
});

// Ler - Obter um
app.get('/api/estudantes/:id', async (req, res) => {
    try {
        const conexao = await obterConexaoBanco();
        const [linhas] = await conexao.execute('SELECT * FROM estudantes WHERE id = ?', [req.params.id]);
        await conexao.end();
        
        if (linhas.length === 0) {
            return res.status(404).json({ erro: 'Estudante não encontrado' });
        }
        res.json(linhas[0]);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar estudante' });
    }
});

// Atualizar
app.put('/api/estudantes/:id', upload.single('foto'), async (req, res) => {
    try {
        const { nome, email, data_nascimento } = req.body;
        const foto = req.file ? req.file.filename : null;
        
        const conexao = await obterConexaoBanco();
        const camposAtualizar = [];
        const valores = [];
        
        if (nome) {
            camposAtualizar.push('nome = ?');
            valores.push(nome);
        }
        if (email) {
            camposAtualizar.push('email = ?');
            valores.push(email);
        }
        if (data_nascimento) {
            camposAtualizar.push('data_nascimento = ?');
            valores.push(data_nascimento);
        }
        if (foto) {
            camposAtualizar.push('foto = ?');
            valores.push(foto);
        }
        
        if (camposAtualizar.length === 0) {
            await conexao.end();
            return res.status(400).json({ erro: 'Nenhum campo para atualizar' });
        }
        
        valores.push(req.params.id);
        const consulta = `UPDATE estudantes SET ${camposAtualizar.join(', ')} WHERE id = ?`;
        
        const [resultado] = await conexao.execute(consulta, valores);
        await conexao.end();
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Estudante não encontrado' });
        }
        
        res.json({ mensagem: 'Estudante atualizado com sucesso' });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao atualizar estudante' });
    }
});

// Excluir
app.delete('/api/estudantes/:id', async (req, res) => {
    try {
        const conexao = await obterConexaoBanco();
        const [resultado] = await conexao.execute('DELETE FROM estudantes WHERE id = ?', [req.params.id]);
        await conexao.end();
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Estudante não encontrado' });
        }
        
        res.json({ mensagem: 'Estudante excluído com sucesso' });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao excluir estudante' });
    }
});

// Iniciar servidor
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log(`Servidor rodando na porta ${PORTA}`);
});
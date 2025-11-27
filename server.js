const express = require('express');
const db = require('./db');
const path = require('path');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. 메인 목록
app.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const limit = 10;
        const offset = (page - 1) * limit;

        let sql = 'SELECT * FROM posts';
        let countSql = 'SELECT COUNT(*) as count FROM posts';
        let params = [];

        if (search) {
            sql += ' WHERE title LIKE ?';
            countSql += ' WHERE title LIKE ?';
            params.push(`%${search}%`);
        }

        sql += ' ORDER BY is_notice DESC, created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [postsRows] = await db.query(sql, params);

        const searchParams = search ? [`%${search}%`] : [];
        const [countRows] = await db.query(countSql, searchParams);

        const totalPosts = countRows[0].count;
        const totalPages = Math.ceil(totalPosts / limit);

        res.render('list', {
            posts: postsRows,
            currentPage: page,
            totalPages: totalPages,
            search: search
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// 2. 글쓰기 페이지
app.get('/write', (req, res) => res.render('write'));

// 3. [수정됨] 글 작성 처리 (author 제외)
app.post('/write', async (req, res) => {
    try {
        // author 입력받지 않음
        const { title, content, is_notice_chk } = req.body;
        const is_notice = (is_notice_chk === 'on') ? 1 : 0;

        // SQL에서도 author 컬럼 제외
        await db.query('INSERT INTO posts (title, content, is_notice) VALUES (?, ?, ?)',
            [title, content, is_notice]);

        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Write Error');
    }
});

// 4. 상세 보기
app.get('/post/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await db.query('UPDATE posts SET views = views + 1 WHERE id = ?', [id]);
        const [rows] = await db.query('SELECT * FROM posts WHERE id = ?', [id]);

        if (rows.length === 0) return res.status(404).send('Not Found');
        res.render('view', { post: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send('View Error');
    }
});

// 수정, 삭제 등 나머지 코드는 동일 (author 부분만 빼고 사용)

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
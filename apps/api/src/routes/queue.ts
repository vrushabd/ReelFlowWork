import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Get queue status' });
});

router.post('/pause', (req, res) => {
  res.json({ message: 'Pause queue' });
});

router.post('/resume', (req, res) => {
  res.json({ message: 'Resume queue' });
});

export const queueRouter = router;

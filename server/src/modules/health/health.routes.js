import { Router } from 'express';
import { health, readiness } from './health.controller.js';
import asyncHandler from '../../utils/asyncHandler.js';
const r = Router();
r.get('/', asyncHandler(health));
r.get('/ready', asyncHandler(readiness));
export default r;

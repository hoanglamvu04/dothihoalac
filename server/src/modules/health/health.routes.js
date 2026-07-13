import { Router } from 'express';
import { health } from './health.controller.js';
import asyncHandler from '../../utils/asyncHandler.js';
const r = Router();
r.get('/', asyncHandler(health));
export default r;

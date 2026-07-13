import { Router } from 'express';
import { run } from './search.controller.js';
import asyncHandler from '../../utils/asyncHandler.js';
const r = Router();
r.get('/', asyncHandler(run));
export default r;

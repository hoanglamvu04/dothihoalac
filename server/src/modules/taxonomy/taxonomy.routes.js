import { Router } from 'express';
import { bootstrap, categories, tags, areas } from './taxonomy.controller.js';
import asyncHandler from '../../utils/asyncHandler.js';
const r = Router();
r.get('/bootstrap', asyncHandler(bootstrap));
r.get('/categories', asyncHandler(categories));
r.get('/tags', asyncHandler(tags));
r.get('/areas', asyncHandler(areas));
export default r;

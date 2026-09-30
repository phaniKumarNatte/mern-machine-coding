import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { validateBody } from '../middleware/validateBody';
import { validateObjectId } from '../middleware/validateObjectId';
import { validateCreateUser, validateUpdateUser } from '../utils/validation';

/**
 * Routes map "HTTP method + URL" to a chain of handlers.
 * Handlers run left to right; any of them can stop the chain by calling next(error).
 * Mounted at /api/users in app.ts, so '/' here means /api/users.
 */
const router = Router();

router.get('/', userController.getUsers);
router.post('/', validateBody(validateCreateUser), userController.createUser);

router.get('/:id', validateObjectId, userController.getUser);
router.put('/:id', validateObjectId, validateBody(validateUpdateUser), userController.updateUser);
router.delete('/:id', validateObjectId, userController.deleteUser);

export default router;

import { Router } from 'express';
import { TeamController } from '../controllers/team.controller';
import { authenticateJWT } from '../middleware/jwtAuth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// Accept invite (public route, no auth required) - must be before auth middleware
router.post('/accept-invite', TeamController.acceptInvite);

// All other routes require JWT authentication
router.use(authenticateJWT);

// Get all team members (any authenticated user can view)
router.get('/', TeamController.getTeamMembers);

// Invite team member (requires team:invite permission - admin or owner)
router.post('/invite', requirePermission('team:invite'), TeamController.inviteTeamMember);

// Get pending invites (requires team:invite permission)
router.get('/invites', requirePermission('team:invite'), TeamController.getPendingInvites);

// Update member role (requires team:update-role permission - admin or owner)
router.patch('/:userId/role', requirePermission('team:update-role'), TeamController.updateMemberRole);

// Remove team member (requires team:remove permission - admin or owner)
router.delete('/:userId', requirePermission('team:remove'), TeamController.removeMember);

export default router;

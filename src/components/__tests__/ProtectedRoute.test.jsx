import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedRoute from '../ProtectedRoute';
const mocks = vi.hoisted(() => ({ user: null }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: mocks.user }) }));
const LoginTarget = () => { const location = useLocation(); return <div>{JSON.stringify(location.state?.from)}</div>; };
function setup() {
    return render(<MemoryRouter initialEntries={['/admin?tab=lives&metadata=42#review']}><Routes>
        <Route element={<ProtectedRoute requireAdmin />}><Route path="/admin" element={<div>Private review</div>} /></Route>
        <Route path="/login" element={<LoginTarget />} /><Route path="/" element={<div>Public home</div>} />
    </Routes></MemoryRouter>);
}
beforeEach(() => { mocks.user = null; });
describe('管理通知の認証ガード', () => {
    it('未ログインはquery/hashを含めてログインへ復帰先を渡す', () => {
        setup(); expect(screen.getByText(/metadata=42/)).toHaveTextContent('#review');
        expect(screen.queryByText('Private review')).not.toBeInTheDocument();
    });
    it('一般ユーザーでは管理ページへ復帰させない', () => {
        mocks.user = { role: 'user' }; setup();
        expect(screen.getByText('Public home')).toBeInTheDocument();
        expect(screen.queryByText('Private review')).not.toBeInTheDocument();
    });
});

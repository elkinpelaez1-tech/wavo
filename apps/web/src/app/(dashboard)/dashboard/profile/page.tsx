'use client';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/lib/auth-store';

export default function ProfilePage() {
  const { user, updateProfile, uploadAvatar } = useAuthStore();

  // Gestión de Foto de perfil / Logo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState('');
  const [avatarError, setAvatarError] = useState('');

  // Formulario de Información de Cuenta
  const [accountForm, setAccountForm] = useState({
    name: '',
    business_name: '',
  });
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState('');
  const [accountError, setAccountError] = useState('');

  // Formulario de Seguridad / Contraseña
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Sincronizar datos iniciales del usuario
  useEffect(() => {
    if (user) {
      setAccountForm({
        name: user.name || '',
        business_name: user.business_name || '',
      });
    }
  }, [user]);

  // Manejador para actualizar Información de Cuenta
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError('');
    setAccountSuccess('');

    if (!accountForm.name.trim()) {
      setAccountError('El nombre no puede estar vacío');
      return;
    }

    setSavingAccount(true);
    try {
      await updateProfile({
        name: accountForm.name.trim(),
        business_name: accountForm.business_name.trim(),
      });
      setAccountSuccess('Información actualizada correctamente');
      setTimeout(() => setAccountSuccess(''), 4000);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al actualizar el perfil';
      setAccountError(msg);
    } finally {
      setSavingAccount(false);
    }
  };

  // Manejador para cambio de Contraseña
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword) {
      setPasswordError('Ingresa tu contraseña actual');
      return;
    }

    if (!passwordForm.newPassword) {
      setPasswordError('Ingresa tu nueva contraseña');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('La nueva contraseña y su confirmación no coinciden');
      return;
    }

    setSavingPassword(true);
    try {
      await updateProfile({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess('Contraseña cambiada exitosamente');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al cambiar la contraseña';
      setPasswordError(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  // Manejador para selección de archivo de avatar
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError('');
    setAvatarSuccess('');

    // Validar tipo (JPG, PNG, WEBP)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setAvatarError('Formato no permitido. Solo se aceptan archivos JPG, PNG o WEBP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validar tamaño máximo (2 MB)
    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setAvatarError('La imagen excede el tamaño máximo permitido de 2 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCancelAvatar = () => {
    setSelectedFile(null);
    setPreview(null);
    setAvatarError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveAvatar = async () => {
    if (!selectedFile) return;

    setSavingAvatar(true);
    setAvatarError('');
    setAvatarSuccess('');

    try {
      await uploadAvatar(selectedFile);
      setAvatarSuccess('Foto de perfil / Logo actualizada exitosamente');
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setAvatarSuccess(''), 4000);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al subir la imagen';
      setAvatarError(msg);
    } finally {
      setSavingAvatar(false);
    }
  };

  const userInitial = user?.name ? user.name[0] : user?.email ? user.email[0] : 'W';

  // Formato de fecha de registro
  const formattedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  return (
    <div className="max-w-2xl space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-[#17201C] tracking-tight">Mi Perfil</h1>
        <p className="text-xs text-[#64716B] mt-1 font-medium">Gestiona tu identidad, datos de negocio y credenciales de acceso</p>
      </div>

      <div className="space-y-6">
        {/* Bloque 1: Foto de perfil / Logo */}
        <div className="card space-y-4">
          <div className="border-b border-[#E4ECE7] pb-3">
            <h2 className="text-sm font-semibold text-[#17201C]">Foto de perfil / Logo</h2>
            <p className="text-xs text-[#64716B] mt-0.5">
              Personaliza tu imagen de perfil o el logo de tu empresa.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Contenedor del Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-[#E8F7F0] text-[#0F8F6F] text-2xl font-bold border border-[#0F8F6F]/20 shadow-2xs overflow-hidden flex items-center justify-center shrink-0 uppercase relative">
              {preview ? (
                <img src={preview} alt="Vista previa" className="w-full h-full object-cover" />
              ) : user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name || user.email} className="w-full h-full object-cover" />
              ) : (
                <span>{userInitial}</span>
              )}
            </div>

            {/* Acciones e instrucciones */}
            <div className="flex-1 space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary text-xs py-2 px-3.5 shadow-2xs"
                  disabled={savingAvatar}
                >
                  {selectedFile ? 'Elegir otra imagen' : 'Cambiar imagen'}
                </button>

                {selectedFile && (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveAvatar}
                      className="btn-primary text-xs py-2 px-4 shadow-2xs"
                      disabled={savingAvatar}
                    >
                      {savingAvatar ? 'Guardando...' : 'Guardar imagen'}
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelAvatar}
                      className="text-xs text-[#64716B] hover:text-red-600 transition-colors px-2 py-1 font-medium"
                      disabled={savingAvatar}
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>

              <p className="text-[11px] text-[#64716B]">
                Formatos permitidos: JPG, PNG o WEBP. Tamaño máximo: 2 MB.
              </p>
            </div>
          </div>

          {avatarError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <span>⚠️</span>
              <span>{avatarError}</span>
            </div>
          )}

          {avatarSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <span>✅</span>
              <span>{avatarSuccess}</span>
            </div>
          )}
        </div>

        {/* Bloque A: Información de la cuenta */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-[#E4ECE7] pb-3">
            <div>
              <h2 className="text-sm font-semibold text-[#17201C]">Información de la cuenta</h2>
              <p className="text-xs text-[#64716B] mt-0.5">
                Gestiona tus datos personales y comerciales asociados a Wavo.
              </p>
            </div>
            <span
              className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase ${
                user?.plan === 'pro'
                  ? 'bg-[#E8F7F0] text-[#0F8F6F] border border-[#0F8F6F]/20'
                  : 'bg-[#F8FAF9] text-[#64716B] border border-[#E4ECE7]'
              }`}
            >
              Plan {user?.plan || 'free'}
            </span>
          </div>

          <form onSubmit={handleAccountSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre completo</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Tu nombre"
                  value={accountForm.name}
                  onChange={(e) => {
                    setAccountForm((prev) => ({ ...prev, name: e.target.value }));
                    setAccountError('');
                  }}
                  required
                />
              </div>

              <div>
                <label className="label">Nombre de empresa / negocio</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Central de Reservas"
                  value={accountForm.business_name}
                  onChange={(e) => {
                    setAccountForm((prev) => ({ ...prev, business_name: e.target.value }));
                    setAccountError('');
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Correo electrónico</label>
                <input
                  type="email"
                  className="input bg-[#F8FAF9] border-[#E4ECE7] text-[#64716B] cursor-not-allowed font-medium"
                  value={user?.email || ''}
                  disabled
                  title="El correo electrónico no puede ser modificado"
                />
                <p className="text-[11px] text-[#64716B] mt-1 font-medium">El correo es tu identificador de acceso único.</p>
              </div>

              <div>
                <label className="label">Fecha de registro</label>
                <input
                  type="text"
                  className="input bg-[#F8FAF9] border-[#E4ECE7] text-[#64716B] cursor-not-allowed capitalize font-medium"
                  value={formattedDate}
                  disabled
                />
              </div>
            </div>

            {accountError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <span>⚠️</span>
                <span>{accountError}</span>
              </div>
            )}

            {accountSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <span>✅</span>
                <span>{accountSuccess}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="btn-primary text-xs py-2 px-4 shadow-2xs"
                disabled={savingAccount}
              >
                {savingAccount ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>

        {/* Bloque B: Seguridad y Contraseña */}
        <div className="card space-y-4">
          <div className="border-b border-[#E4ECE7] pb-3">
            <h2 className="text-sm font-semibold text-[#17201C]">Seguridad</h2>
            <p className="text-xs text-[#64716B] mt-0.5">
              Actualiza tu contraseña para mantener protegida tu cuenta.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="label">Contraseña actual</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={passwordForm.currentPassword}
                onChange={(e) => {
                  setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }));
                  setPasswordError('');
                }}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nueva contraseña</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Mínimo 6 caracteres"
                  value={passwordForm.newPassword}
                  onChange={(e) => {
                    setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }));
                    setPasswordError('');
                  }}
                  required
                />
              </div>

              <div>
                <label className="label">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Repite la nueva contraseña"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => {
                    setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }));
                    setPasswordError('');
                  }}
                  required
                />
              </div>
            </div>

            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <span>⚠️</span>
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <span>✅</span>
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="btn-primary text-xs py-2 px-4 shadow-2xs"
                disabled={savingPassword}
              >
                {savingPassword ? 'Cambiando contraseña...' : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

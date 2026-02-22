// src/components/ProfileAddresses.jsx
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../services/api";
import {
  MapPin, Plus, Pencil, Trash2, Star, CheckCircle,
  AlertCircle, X, Home, Briefcase, Package,
} from "lucide-react";

// ─── Address Label Icons ──────────────────────────────────────────────────────
const LABEL_ICONS = {
  Home:   Home,
  Office: Briefcase,
  Other:  Package,
};

// ─── Empty Form State ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  address_label:    "Home",
  full_name:        "",
  phone_number:     "",
  address_line1:    "",
  address_line2:    "",
  city:             "",
  state_province:   "",
  postal_code:      "",
  country_code:     "MY",
};

// ─── Address Form Modal ───────────────────────────────────────────────────────
function AddressFormModal({ initial, onSave, onClose, saving, error }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  const isEdit = !!initial?.id;

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const inputClass =
    "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-shadow";
  const labelClass = "block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {isEdit ? "Edit Address" : "Add New Address"}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Fields marked * are required
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Address Label */}
          <div>
            <label className={labelClass}>Label</label>
            <div className="flex gap-2">
              {["Home", "Office", "Other"].map((label) => {
                const Icon = LABEL_ICONS[label];
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, address_label: label }))}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                      form.address_label === label
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Full Name + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Full Name *</label>
              <input
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                placeholder="Daniel Jie"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input
                name="phone_number"
                value={form.phone_number}
                onChange={handleChange}
                placeholder="0123456789"
                className={inputClass}
              />
            </div>
          </div>

          {/* Address Line 1 */}
          <div>
            <label className={labelClass}>Address Line 1 *</label>
            <input
              name="address_line1"
              value={form.address_line1}
              onChange={handleChange}
              placeholder="123 Jalan Ampang"
              required
              className={inputClass}
            />
          </div>

          {/* Address Line 2 */}
          <div>
            <label className={labelClass}>
              Address Line 2
              <span className="text-gray-400 font-normal normal-case ml-1">(optional)</span>
            </label>
            <input
              name="address_line2"
              value={form.address_line2}
              onChange={handleChange}
              placeholder="Unit / Floor / Building"
              className={inputClass}
            />
          </div>

          {/* City + Postal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>City *</label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="Kuala Lumpur"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Postal Code *</label>
              <input
                name="postal_code"
                value={form.postal_code}
                onChange={handleChange}
                placeholder="50450"
                required
                className={inputClass}
              />
            </div>
          </div>

          {/* State + Country */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>State / Province *</label>
              <input
                name="state_province"
                value={form.state_province}
                onChange={handleChange}
                placeholder="WP Kuala Lumpur"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Country Code *</label>
              <select
                name="country_code"
                value={form.country_code}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="MY">MY — Malaysia</option>
                <option value="SG">SG — Singapore</option>
                <option value="US">US — United States</option>
                <option value="GB">GB — United Kingdom</option>
                <option value="AU">AU — Australia</option>
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : isEdit ? "Update Address" : "Add Address"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border-2 border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-semibold hover:border-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Address Card ─────────────────────────────────────────────────────────────
function AddressCard({ address, onEdit, onDelete, onSetDefault, deleting, settingDefault }) {
  const LabelIcon = LABEL_ICONS[address.address_label] ?? MapPin;

  return (
    <div
      className={`relative border-2 rounded-xl p-5 transition-all ${
        address.is_default
          ? "border-gray-900 bg-gray-50"
          : "border-gray-100 bg-white hover:border-gray-200"
      }`}
    >
      {/* Default Badge */}
      {address.is_default && (
        <span className="absolute -top-3 left-4 bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
          <Star className="w-3 h-3 fill-white" />
          Default
        </span>
      )}

      {/* Label + Actions Row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${address.is_default ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
            <LabelIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-bold text-gray-800">{address.address_label ?? "Address"}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(address)}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(address.id)}
            disabled={deleting}
            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Address Details */}
      <div className="text-sm text-gray-700 space-y-0.5">
        <p className="font-semibold">{address.full_name}</p>
        {address.phone_number && (
          <p className="text-gray-500 text-xs">{address.phone_number}</p>
        )}
        <p className="mt-1">{address.address_line1}</p>
        {address.address_line2 && <p>{address.address_line2}</p>}
        <p>
          {address.city}, {address.postal_code}
        </p>
        <p>
          {address.state_province}, {address.country_code}
        </p>
      </div>

      {/* Set Default Button */}
      {!address.is_default && (
        <button
          onClick={() => onSetDefault(address.id)}
          disabled={settingDefault}
          className="mt-4 w-full border border-gray-200 text-gray-600 py-2 rounded-lg text-xs font-semibold hover:border-gray-900 hover:text-gray-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <Star className="w-3.5 h-3.5" />
          {settingDefault ? "Updating..." : "Set as Default"}
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfileAddresses() {
  const { user } = useAuth();

  const [addresses, setAddresses]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [fetchError, setFetchError]     = useState(null);

  const [modalOpen, setModalOpen]       = useState(false);
  const [editingAddr, setEditingAddr]   = useState(null);  // null = add mode, object = edit mode
  const [formError, setFormError]       = useState(null);
  const [saving, setSaving]             = useState(false);

  const [deletingId, setDeletingId]     = useState(null);
  const [defaultingId, setDefaultingId] = useState(null);
  const [successMsg, setSuccessMsg]     = useState(null);

  // ─── Fetch all addresses ────────────────────────────────────────────────────
  const fetchAddresses = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setFetchError(null);
    try {
      const data = await getAddresses(user.id);
      setAddresses(data ?? []);
    } catch (err) {
      setFetchError(err.message || "Failed to load addresses.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // ─── Open modal ─────────────────────────────────────────────────────────────
  const openAdd  = () => { setEditingAddr(null); setFormError(null); setModalOpen(true); };
  const openEdit = (addr) => { setEditingAddr(addr); setFormError(null); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingAddr(null); setFormError(null); };

  // ─── Save (create or update) ─────────────────────────────────────────────────
  const handleSave = async (formData) => {
    setSaving(true);
    setFormError(null);
    try {
      if (editingAddr?.id) {
        // Update existing
        const updated = await updateAddress(user.id, editingAddr.id, formData);
        setAddresses((prev) =>
          prev.map((a) => (a.id === editingAddr.id ? { ...a, ...updated } : a))
        );
        showSuccess("Address updated.");
      } else {
        // Create new — refetch to get server-assigned ID and default flag
        await createAddress(user.id, formData);
        await fetchAddresses();
        showSuccess("Address added.");
      }
      closeModal();
    } catch (err) {
      setFormError(err.message || "Failed to save address.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (addressId) => {
    if (!window.confirm("Delete this address?")) return;
    setDeletingId(addressId);
    try {
      await deleteAddress(user.id, addressId);
      setAddresses((prev) => prev.filter((a) => a.id !== addressId));
      showSuccess("Address deleted.");
    } catch (err) {
      alert(err.message || "Failed to delete address.");
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Set Default ────────────────────────────────────────────────────────────
  const handleSetDefault = async (addressId) => {
    setDefaultingId(addressId);
    try {
      await setDefaultAddress(user.id, addressId);
      // Update is_default locally — only one can be default at a time
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === addressId }))
      );
      showSuccess("Default address updated.");
    } catch (err) {
      alert(err.message || "Failed to set default address.");
    } finally {
      setDefaultingId(null);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Saved Addresses</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {addresses.length > 0
                ? `${addresses.length} address${addresses.length > 1 ? "es" : ""} saved`
                : "No addresses saved yet"}
            </p>
          </div>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Address
        </button>
      </div>

      {/* Success Toast */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-6 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="border-2 border-gray-100 rounded-xl p-5 animate-pulse space-y-3">
              <div className="h-4 bg-gray-100 rounded w-1/4" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Fetch Error */}
      {!loading && fetchError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p>{fetchError}</p>
            <button
              onClick={fetchAddresses}
              className="mt-2 underline text-red-700 font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !fetchError && addresses.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-600 font-semibold mb-1">No addresses yet</h3>
          <p className="text-gray-400 text-sm mb-6">
            Add a delivery address to speed up checkout.
          </p>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Your First Address
          </button>
        </div>
      )}

      {/* Address Grid */}
      {!loading && !fetchError && addresses.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <AddressCard
              key={addr.id}
              address={addr}
              onEdit={openEdit}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              deleting={deletingId === addr.id}
              settingDefault={defaultingId === addr.id}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <AddressFormModal
          initial={editingAddr}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
          error={formError}
        />
      )}
    </div>
  );
}
/**
 * Etap 2 — eksporty listy użytkowników wyjęte z Admin.tsx.
 *
 * Cały ten moduł jest importowany dynamicznie (`await import(...)`) dopiero
 * w momencie kliknięcia konkretnego eksportu, a wewnątrz niego jsPDF / xlsx /
 * jszip są ładowane osobnymi dynamicznymi importami. Dzięki temu ani AdminShell,
 * ani chunk modułu użytkowników nie zawiera ciężkich bibliotek eksportu.
 */

export interface ExportableUser {
  user_id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  eq_id?: string | null;
  role: string;
  is_active?: boolean | null;
  created_at: string;
  email_confirmed_at?: string | null;
}

export const getRoleDisplayName = (role: string) => {
  switch (role) {
    case 'admin': return 'Administrator';
    case 'partner': return 'Partner';
    case 'specjalista': return 'Specjalista';
    case 'guest': return 'Gość PLC';
    case 'moderator': return 'Moderator';
    case 'user':
    case 'client':
    default: return 'Klient';
  }
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const buildXml = (users: ExportableUser[]) => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<users>\n';
  users.forEach(user => {
    xml += '  <user>\n';
    xml += `    <email>${user.email}</email>\n`;
    xml += `    <role>${user.role}</role>\n`;
    xml += `    <is_active>${user.is_active}</is_active>\n`;
    xml += `    <created_at>${user.created_at}</created_at>\n`;
    xml += `    <email_confirmed>${user.email_confirmed_at ? 'true' : 'false'}</email_confirmed>\n`;
    xml += `    <user_id>${user.user_id}</user_id>\n`;
    xml += '  </user>\n';
  });
  xml += '</users>';
  return xml;
};

export const exportUsersToPDF = async (users: ExportableUser[]) => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text('Lista Klientów', 20, 20);

  let yPosition = 40;
  doc.setFontSize(12);

  users.forEach((user, index) => {
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }
    doc.text(`${index + 1}. Email: ${user.email}`, 20, yPosition);
    doc.text(`   Rola: ${getRoleDisplayName(user.role)}`, 20, yPosition + 10);
    doc.text(`   Status: ${user.is_active ? 'Aktywny' : 'Nieaktywny'}`, 20, yPosition + 20);
    doc.text(`   Utworzono: ${new Date(user.created_at).toLocaleDateString('pl-PL')}`, 20, yPosition + 30);
    yPosition += 45;
  });

  doc.save('klienci.pdf');
};

export const exportUsersToXLSX = async (users: ExportableUser[]) => {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(
    users.map(user => ({
      Email: user.email,
      'Imię': user.first_name || '',
      'Nazwisko': user.last_name || '',
      'EQ ID': user.eq_id || '',
      Rola: getRoleDisplayName(user.role),
      Status: user.is_active ? 'Aktywny' : 'Nieaktywny',
      'Data utworzenia': new Date(user.created_at).toLocaleDateString('pl-PL'),
      'Email potwierdzony': user.email_confirmed_at ? 'Tak' : 'Nie',
      ID: user.user_id,
    })),
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Klienci');
  XLSX.writeFile(workbook, 'klienci.xlsx');
};

export const exportUsersToXML = (users: ExportableUser[]) => {
  downloadBlob(new Blob([buildXml(users)], { type: 'text/xml' }), 'uzytkownicy.xml');
};

export const exportUsersToZIP = async (users: ExportableUser[]) => {
  const [{ default: JSZip }, { default: jsPDF }, XLSX] = await Promise.all([
    import('jszip'),
    import('jspdf'),
    import('xlsx'),
  ]);

  const zip = new JSZip();

  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text('Lista Użytkowników', 20, 20);

  let yPosition = 40;
  doc.setFontSize(12);

  users.forEach((user, index) => {
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }
    doc.text(`${index + 1}. Email: ${user.email}`, 20, yPosition);
    doc.text(`   Rola: ${user.role === 'admin' ? 'Administrator' : 'Użytkownik'}`, 20, yPosition + 10);
    doc.text(`   Status: ${user.is_active ? 'Aktywny' : 'Nieaktywny'}`, 20, yPosition + 20);
    doc.text(`   Utworzono: ${new Date(user.created_at).toLocaleDateString('pl-PL')}`, 20, yPosition + 30);
    yPosition += 45;
  });

  zip.file('uzytkownicy.pdf', doc.output('blob'));

  const worksheet = XLSX.utils.json_to_sheet(
    users.map(user => ({
      Email: user.email,
      Rola: user.role === 'admin' ? 'Administrator' : 'Użytkownik',
      Status: user.is_active ? 'Aktywny' : 'Nieaktywny',
      'Data utworzenia': new Date(user.created_at).toLocaleDateString('pl-PL'),
      'Email potwierdzony': user.email_confirmed_at ? 'Tak' : 'Nie',
      ID: user.user_id,
    })),
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Użytkownicy');
  zip.file('uzytkownicy.xlsx', XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));

  zip.file('uzytkownicy.xml', buildXml(users));

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, 'uzytkownicy.zip');
};

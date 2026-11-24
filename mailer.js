import nodemailer from 'nodemailer';

// Настройка транспорта для Mail.ru
const transporter = nodemailer.createTransport({
    host: 'smtp.mail.ru',
    port: 465,
    secure: true, // Используем SSL
    auth: {
        user: 'billiherington345@mail.ru', // Ваш email для авторизации
        pass: 'xqJiRQmUXF23FnheP2N0' // Пароль БЕЗ пробела на конце
    }
});

export async function sendVerificationCode(email, code) {
    const mailOptions = {
        from: '"Автономные системы" <billiherington345@mail.ru>', // Отправитель совпадает с тем, кто авторизован
        to: email,
        subject: 'Подтверждение регистрации',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                <h2 style="color: #0f172a;">Добро пожаловать!</h2>
                <p>Спасибо за регистрацию на сайте <strong>Автономные системы</strong>.</p>
                <p>Ваш код подтверждения:</p>
                <div style="background: #f8fafc; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <h1 style="color: #ffcc00; font-size: 36px; letter-spacing: 8px; margin: 0;">${code}</h1>
                </div>
                <p>Введите этот код на сайте, чтобы завершить регистрацию.</p>
                <p style="color: #64748b; font-size: 12px;">Если вы не регистрировались на нашем сайте, просто проигнорируйте это письмо.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Код отправлен на ${email}`);
        return true;
    } catch (error) {
        console.error('Ошибка отправки письма:', error);
        return false;
    }
}
import { db } from "@/data/db";

// Function to convert array of objects to CSV
function convertToCSV(data: any[]): string {
    if (!data || data.length === 0) {
        return "";
    }
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => 
        headers.map(header => 
            JSON.stringify(obj[header], (key, value) => value === undefined ? '' : value)
        ).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
}

// Function to trigger CSV download
function downloadCSV(csvString: string, filename: string): void {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Export all chats to a single CSV
export async function exportAllChats(): Promise<void> {
    const allMessages = await db.messages.toArray();
    const chats = await db.chats.toArray();
    
    // Simple join, you might want a more sophisticated mapping
    const exportData = allMessages.map(msg => {
        const chat = chats.find(c => c.id === msg.chatId);
        return {
            ...msg,
            chatTitle: chat?.title || 'N/A'
        };
    });

    if (exportData.length === 0) {
        alert("No data to export.");
        return;
    }

    const csv = convertToCSV(exportData);
    downloadCSV(csv, 'all_chats.csv');
}

// Export a single chat to CSV
export async function exportSingleChat(chatIds: string[]): Promise<void> {
    const messages = await db.messages.where('chatId').anyOf(chatIds).toArray();
    
    if (messages.length === 0) {
        alert("No messages to export in the selected chats.");
        return;
    }
    
    const chats = await db.chats.where('id').anyOf(chatIds).toArray();
    const chatTitleMap = new Map(chats.map(c => [c.id, c.title || 'Untitled Chat']));

    const exportData = messages.map(msg => ({
        ...msg,
        chatTitle: chatTitleMap.get(msg.chatId) || 'N/A'
    }));
    
    const csv = convertToCSV(exportData);
    downloadCSV(csv, `selected_chats.csv`);
}

// Reset all data
export async function resetAllData(): Promise<void> {
    await Promise.all([
        db.chats.clear(),
        db.messages.clear(),
        db.conversations.clear()
    ]);
} 
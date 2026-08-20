import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export async function shareReportHtml(html: string): Promise<{ error: string | null }> {
  try {
    // On web there is no share sheet — the print dialog is the way to reach
    // "Save as PDF", which is the closest equivalent.
    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
      return { error: null };
    }

    const { uri } = await Print.printToFileAsync({ html });

    if (!(await Sharing.isAvailableAsync())) {
      return { error: 'Sharing is not available on this device.' };
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share your budget summary',
      UTI: 'com.adobe.pdf',
    });
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not create the summary.' };
  }
}

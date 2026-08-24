import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  SearchBar, 
  FilterChips, 
  SectionHeader, 
  PlayerScoreCard, 
  BowlerScoreCard 
} from '../../src/components';
import { colors, typography } from '../../src/theme';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('All Formats');

  const formatOptions = ['All Formats', 'T20', 'ODI', 'Test'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Player Stats</Text>
        </View>

        <View style={styles.searchSection}>
          <SearchBar 
            placeholder="Search players, teams..." 
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterSection}>
          <FilterChips 
            options={formatOptions}
            selectedOption={selectedFormat}
            onSelect={setSelectedFormat}
          />
        </View>

        <View style={styles.sectionContainer}>
          <SectionHeader title="Top Run Scorers" />
          <View style={styles.cardGroup}>
            <PlayerScoreCard 
              name="V. Kohli"
              team="India"
              runs={765}
              average={95.62}
              strikeRate={90.31}
              imageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuDrMyzTedhRrXyj3f4sVtW--YsB-5TTmSNYXMh5AXhCoPoLeW97Xnp_nYrcSn8oVnbzxT_LtyeG_KsyvjTQsWfizL6sVZ6SWYvurIFAi2ilhdBH5xoIQsRktqxX1smT5pZr4pIoP2WfcIEfz-bCfVvxGNNdWg18Ga6bQI8tPw_AufiSTzx3ChP3LIGFK53iUp9KYIGwfv94JRZ3eL-HWkIb_6vyQY_26ol0iOJ6Px0Vhvj7Q3295s7LoQ"
            />
            <PlayerScoreCard 
              name="D. Warner"
              team="Australia"
              runs={528}
              average={48.00}
              strikeRate={108.2}
              imageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuC4q5bT7Ggddbj7moYGKUb17DZA4JkfvvP2eFo-exS9BRBGyG2bQspZ0mkvi9oj3av0i34sPqexUstgg8gJu-wOT6xq-Bdhneho4mQjPE5kInsoGCyzPiaxBOb_SdyaQqe7EZoTGCsomqfn3YnNNAPQ5C73ThGOj7GT3pMJ9oSEfGZp9Bq4cmhKaCCXL2kodQvVfmYcECdaA4HMC9Mp_AjMvfoLdV3pixPmrH9VInaGSd6b-fCsJKM9Cw"
              isLast={true}
            />
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <SectionHeader title="Top Wicket Takers" />
          <View style={styles.cardGroup}>
            <BowlerScoreCard 
              variant="highlight"
              name="M. Shami"
              team="India"
              wickets={24}
              economy={5.26}
              average={10.70}
              imageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuAdb7a6TtZQM66-B4CrzBH_pMjZvXofc389KYOpa-kmwMAIHs06C3n0dKwGkFzjeUMLhWR_VYcRNZIuld5cpdFHNX88k_YVNfQlrUHB5UIysUSNyxhQRvn4ALIVoGa28o8kxFtrBTxIaGdiVVIqW9KCO9jHw0oXdZsf8qox4FBka0R_tdNZ-NO96v4Ch-Zb8Dah6jWllPVqdnXvXkCEOQK71A4_OCVyOQ7-c7ReBS4aqv5ZiwAWWTIgbQ"
            />
            <BowlerScoreCard 
              variant="compact"
              rank={2}
              name="A. Zampa"
              wickets={22}
            />
            <BowlerScoreCard 
              variant="compact"
              rank={3}
              name="D. Madushanka"
              wickets={21}
            />
            <BowlerScoreCard 
              variant="compact"
              rank={4}
              name="G. Coetzee"
              wickets={20}
              isLast={true}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
  },
  scrollContent: {
    paddingBottom: 24, // Padding at bottom so it doesn't get cut off by bottom nav
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: typography.largeTitle.fontSize,
    fontWeight: typography.largeTitle.fontWeight,
    color: colors.onSurface,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  cardGroup: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    backgroundColor: colors.surfaceContainerLowest,
  }
});

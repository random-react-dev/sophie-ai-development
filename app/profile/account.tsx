import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSettingCard from "@/components/profile/ProfileSettingCard";
import { useAuthStore } from "@/stores/authStore";
import { getRainbowColorScheme } from "@/utils/rainbowColors";
import { useRouter } from "expo-router";
import { Crown, Receipt, Sparkles, Wallet } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AccountScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <ProfileHeader title="Account" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Main Card Display */}
        {/* <View className="mx-4 mt-6">
                    <View className="bg-white rounded-2xl p-6 shadow-sm items-center">
                        <View className="w-16 h-16 rounded-2xl bg-amber-50 items-center justify-center mb-4">
                            <User size={32} color="#f59e0b" />
                        </View>
                        <Text className="text-xl font-bold text-gray-900">Account</Text>
                        <Text className="text-sm text-gray-500 mt-1">
                            Manage your account settings
                        </Text>
                    </View>
                </View> */}

        {/* Account Items */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Subscription
          </Text>

          {/* Status Card */}
          <ProfileSettingCard
            title="Status"
            icon={<Sparkles size={20} color={getRainbowColorScheme(0).iconColor} />}
            colorScheme={getRainbowColorScheme(0)}
            showArrow={false}
            rightElement={
              <View className="bg-yellow-100 px-3 py-1 rounded-full">
                <Text className="text-yellow-600 text-xs font-bold uppercase">
                  Free Trial
                </Text>
              </View>
            }
          />

          {/* Upgrade to Pro Card */}
          <ProfileSettingCard
            title="Upgrade to Pro"
            icon={<Crown size={20} color={getRainbowColorScheme(1).iconColor} />}
            colorScheme={getRainbowColorScheme(1)}
            textColor="text-blue-500"
            onPress={() => {
              router.push("/profile/subscription");
            }}
          />
        </View>

        {/* Payment Section */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Payment
          </Text>

          {/* Payment Methods Card */}
          <View className="opacity-60">
            <ProfileSettingCard
              title="Payment Methods"
              subtitle="Coming Soon"
              icon={<Wallet size={20} color={getRainbowColorScheme(2).iconColor} />}
              colorScheme={getRainbowColorScheme(2)}
              showArrow={false}
              rightElement={
                <Text className="text-xs text-gray-400 font-medium">
                  Coming Soon
                </Text>
              }
            />
          </View>

          {/* Billing History Card */}
          <View className="opacity-60">
            <ProfileSettingCard
              title="Billing History"
              icon={<Receipt size={20} color={getRainbowColorScheme(3).iconColor} />}
              colorScheme={getRainbowColorScheme(3)}
              showArrow={false}
              rightElement={
                <Text className="text-xs text-gray-400 font-medium">
                  Coming Soon
                </Text>
              }
            />
          </View>
        </View>

        {/* Account Info */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Account Info
          </Text>

          <View className="bg-surface rounded-2xl p-4 shadow-sm">
            <View className="flex-row justify-between py-2">
              <Text className="text-gray-500">Email</Text>
              <Text className="text-gray-900 font-medium">{user?.email}</Text>
            </View>
            <View className="flex-row justify-between py-2 border-t border-gray-100">
              <Text className="text-gray-500">Member Since</Text>
              <Text className="text-gray-900 font-medium">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : "N/A"}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

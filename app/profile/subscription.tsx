import { Check } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import { RainbowBorder } from "@/components/common/Rainbow";
import { RainbowWave } from "@/components/lesson/RainbowWave";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type ProductSku,
  getAvailableSubscriptionPlanIds,
  getSubscriptionProducts,
  purchase as iapPurchase,
  restorePurchases,
} from "@/services/iap/client";
import {
  useEntitlementExpiresAt,
  useEntitlementProductId,
  useEntitlementStore,
  useIsPro,
} from "@/stores/entitlementStore";

const MONTHLY_SKU: ProductSku = "ai.speakwithsophie.app.premium.monthly";
const SEMIANNUAL_SKU: ProductSku = "ai.speakwithsophie.app.premium.semiannual";
const ANDROID_PACKAGE_NAME = "ai.speakwithsophie.app";
const ANDROID_SUBSCRIPTION_ID = "ai.speakwithsophie.app.premium";

function FeatureCheck({ text }: { text: string }) {
  return (
    <View className="flex-row items-start gap-3 mb-3">
      <RainbowBorder
        borderRadius={9999}
        borderWidth={1.5}
        className="w-5 h-5"
        containerClassName="items-center justify-center mt-0.5"
      >
        <Check size={10} color="black" strokeWidth={2.5} />
      </RainbowBorder>
      <Text className="text-gray-600 text-sm font-normal flex-1 leading-5">
        {text}
      </Text>
    </View>
  );
}

type Plan = {
  id: "free" | "monthly" | "semiannual";
  sku?: ProductSku;
  name: string;
  description: string;
  price: string;
  duration: string;
  badge?: string;
  discountBadge?: string;
  features: string[];
  isFeatured: boolean;
  cta?: string;
  disclosure?: string;
};

export default function SubscriptionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isPro = useIsPro();
  const expiresAt = useEntitlementExpiresAt();
  const productId = useEntitlementProductId();
  const refresh = useEntitlementStore((s) => s.refresh);

  const { alertState, showAlert, hideAlert } = useAlertModal();

  const [purchasingSku, setPurchasingSku] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [availableSkus, setAvailableSkus] = useState<Set<string>>(new Set());
  const [productsError, setProductsError] = useState<"empty" | "fetch_failed" | null>(null);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const list = await getSubscriptionProducts();
      const ids = getAvailableSubscriptionPlanIds(list);
      setAvailableSkus(ids);
      setProductsError(list.length === 0 ? "empty" : null);
    } catch {
      setAvailableSkus(new Set());
      setProductsError("fetch_failed");
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handlePurchase = async (sku: ProductSku) => {
    if (purchasingSku) return;
    if (!availableSkus.has(sku)) {
      showAlert(
        t("common.error"),
        t("profile.subscription_screen.errors.unavailable"),
        undefined,
        "error",
      );
      return;
    }
    setPurchasingSku(sku);
    try {
      await iapPurchase(sku);
      // Success/finalization happens via the listener wired up in app/_layout.tsx.
    } catch (err) {
      console.warn("[subscription] purchase error:", err);
      showAlert(
        t("common.error"),
        t("profile.subscription_screen.errors.purchaseFailed"),
        undefined,
        "error",
      );
    } finally {
      setPurchasingSku(null);
    }
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const results = await restorePurchases();
      await refresh();
      if (results.length === 0) {
        showAlert(
          t("profile.subscription_screen.restore.noneTitle"),
          t("profile.subscription_screen.restore.noneBody"),
          undefined,
          "info",
        );
      } else {
        showAlert(
          t("profile.subscription_screen.restore.successTitle"),
          t("profile.subscription_screen.restore.successBody"),
          undefined,
          "success",
        );
      }
    } catch (err) {
      console.warn("[subscription] restore error:", err);
      showAlert(
        t("common.error"),
        t("profile.subscription_screen.errors.restoreFailed"),
        undefined,
        "error",
      );
    } finally {
      setRestoring(false);
    }
  };

  const PLANS: Plan[] = [
    {
      id: "free",
      name: t("profile.subscription_screen.plans.mg.name"),
      description: t("profile.subscription_screen.plans.mg.description"),
      price: "$0",
      duration: t("profile.subscription_screen.common.day7"),
      features: [
        t("profile.subscription_screen.plans.mg.features.0"),
        t("profile.subscription_screen.plans.mg.features.1"),
        t("profile.subscription_screen.plans.mg.features.2"),
        t("profile.subscription_screen.plans.mg.features.3"),
        t("profile.subscription_screen.plans.mg.features.4"),
      ],
      isFeatured: false,
      disclosure: t("profile.subscription_screen.disclosures.freeTrial"),
    },
    {
      id: "monthly",
      sku: MONTHLY_SKU,
      name: t("profile.subscription_screen.plans.scf.name"),
      description: t("profile.subscription_screen.plans.scf.description"),
      badge: t("profile.subscription_screen.plans.scf.badge"),
      price: "$7.99",
      duration: t("profile.subscription_screen.common.month"),
      features: [
        t("profile.subscription_screen.plans.scf.features.0"),
        t("profile.subscription_screen.plans.scf.features.1"),
        t("profile.subscription_screen.plans.scf.features.2"),
        t("profile.subscription_screen.plans.scf.features.3"),
      ],
      isFeatured: true,
      cta: t("profile.subscription_screen.common.subscribe"),
      disclosure: t("profile.subscription_screen.disclosures.monthlyRenewal"),
    },
    {
      id: "semiannual",
      sku: SEMIANNUAL_SKU,
      name: t("profile.subscription_screen.plans.sbb.name"),
      description: t("profile.subscription_screen.plans.sbb.description"),
      badge: t("profile.subscription_screen.plans.sbb.badge"),
      price: "$11.99",
      duration: t("profile.subscription_screen.common.sixMonths"),
      features: [
        t("profile.subscription_screen.plans.sbb.features.0"),
        t("profile.subscription_screen.plans.sbb.features.1"),
        t("profile.subscription_screen.plans.sbb.features.2"),
        t("profile.subscription_screen.plans.sbb.features.3"),
        t("profile.subscription_screen.plans.sbb.features.4"),
      ],
      isFeatured: false,
      cta: t("profile.subscription_screen.common.subscribe"),
      disclosure: t("profile.subscription_screen.disclosures.semiannualRenewal"),
    },
  ];

  const renderActiveCard = () => {
    const renews = expiresAt
      ? `${String(expiresAt.getDate()).padStart(2, "0")}/${String(
          expiresAt.getMonth() + 1,
        ).padStart(2, "0")}/${expiresAt.getFullYear()}`
      : "—";
    const manageUrl =
      Platform.OS === "android"
        ? `https://play.google.com/store/account/subscriptions?package=${ANDROID_PACKAGE_NAME}&sku=${ANDROID_SUBSCRIPTION_ID}`
        : "https://apps.apple.com/account/subscriptions";
    return (
      <View className="mx-4 mb-6">
        <RainbowBorder
          borderRadius={24}
          borderWidth={2}
          className="w-full"
          containerClassName="bg-white"
        >
          <View className="p-6">
            <Text className="text-xl font-bold text-gray-900 mb-1">
              {t("profile.subscription_screen.active.title")}
            </Text>
            {productId && (
              <Text className="text-sm text-gray-500 mb-3">{productId}</Text>
            )}
            <Text className="text-gray-700 mb-4">
              {t("profile.subscription_screen.active.renewsOn", {
                date: renews,
              })}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => Linking.openURL(manageUrl)}
              className="w-full h-12 rounded-full bg-gray-100 items-center justify-center"
            >
              <Text className="text-black font-semibold">
                {t("profile.subscription_screen.active.manage")}
              </Text>
            </TouchableOpacity>
          </View>
        </RainbowBorder>
      </View>
    );
  };

  const renderPlanCard = (plan: Plan) => {
    const isPurchasing = purchasingSku === plan.sku;
    const skuUnavailable =
      !!plan.sku && !productsLoading && !availableSkus.has(plan.sku);
    const isButtonDisabled =
      isPurchasing || !!purchasingSku || productsLoading || skuUnavailable;
    const buttonLabel = productsLoading
      ? undefined
      : skuUnavailable
        ? t("profile.subscription_screen.errors.productNotReady")
        : plan.cta;
    const cardContent = (
      <View className="p-6 relative">
        {plan.badge && (
          <View className="absolute top-6 right-6 z-10 bg-white rounded-full">
            <RainbowBorder
              borderRadius={9999}
              borderWidth={1.5}
              containerClassName="px-3 py-2 bg-white"
            >
              <Text className="text-amber-500 text-[10px] font-bold uppercase tracking-widest">
                {plan.badge}
              </Text>
            </RainbowBorder>
          </View>
        )}

        <View className="mb-6 pt-2">
          <Text className="text-xl font-bold text-gray-900 mb-1">
            {plan.name}
          </Text>
          <Text className="text-sm text-gray-500">{plan.description}</Text>
        </View>

        <View className="mb-6">
          <View className="flex-row items-baseline gap-1">
            <Text className="text-[40px] leading-[48px] font-black text-gray-900">
              {plan.price}
            </Text>
            <Text className="text-gray-900 font-normal flex-grow text-base">
              / {plan.duration}
            </Text>
          </View>
        </View>

        <View className="mb-6 flex-1 mt-2">
          {plan.features.map((feature, idx) => (
            <FeatureCheck key={`feat-${plan.id}-${idx}`} text={feature} />
          ))}
        </View>

        <View className="mt-auto">
          {plan.sku ? (
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isButtonDisabled}
              onPress={() => handlePurchase(plan.sku!)}
              className={`w-full h-14 rounded-full items-center justify-center ${
                isPurchasing || productsLoading || skuUnavailable
                  ? "bg-gray-200"
                  : "bg-black"
              }`}
            >
              {isPurchasing || productsLoading ? (
                <ActivityIndicator color="#111827" />
              ) : (
                <Text
                  className={`font-bold text-base ${
                    skuUnavailable ? "text-gray-500" : "text-white"
                  }`}
                >
                  {buttonLabel}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <View className="w-full h-14 rounded-full bg-gray-100 items-center justify-center">
              <Text className="text-black font-semibold text-base">
                {t("profile.subscription_screen.common.includedFreeTrial")}
              </Text>
            </View>
          )}
          {plan.disclosure && (
            <Text className="text-gray-500 text-[11px] leading-4 mt-3 text-center">
              {plan.disclosure}
            </Text>
          )}
        </View>
      </View>
    );

    if (plan.isFeatured) {
      return (
        <View key={plan.id} className="mb-6 shadow-xl shadow-red-500/10">
          <RainbowBorder
            borderRadius={24}
            borderWidth={2}
            className="w-full"
            containerClassName="bg-white"
          >
            {cardContent}
          </RainbowBorder>
        </View>
      );
    }

    return (
      <View
        key={plan.id}
        className="mb-6 rounded-3xl bg-white border border-gray-200 shadow-sm"
      >
        {cardContent}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ProfileHeader title={t("profile.subscription_screen.title")} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="px-4 py-10 items-center">
          <View className="items-center justify-center h-16">
            <RainbowWave
              isListening={false}
              isSpeaking={false}
              isProcessing={false}
              width={120}
              height={40}
              amplitudeScale={3.5}
              static={true}
            />
          </View>
          <Text className="text-2xl font-bold text-gray-900 text-center">
            {t("profile.subscription_screen.choosePlan")}
          </Text>
          <Text className="text-base text-gray-500 text-center mt-2">
            {t("profile.subscription_screen.subtitle")}
          </Text>
        </View>

        {isPro ? renderActiveCard() : null}

        {!isPro && productsError && !productsLoading ? (
          <View className="mx-4 mb-4 p-4 rounded-2xl bg-red-50 border border-red-100">
            <Text className="text-sm font-semibold text-red-700 mb-1">
              {t("profile.subscription_screen.unavailableBanner.title")}
            </Text>
            <Text className="text-sm text-red-700 mb-3">
              {t("profile.subscription_screen.unavailableBanner.body")}
            </Text>
            <TouchableOpacity
              onPress={loadProducts}
              activeOpacity={0.8}
              className="self-start px-4 py-2 rounded-full bg-red-600"
            >
              <Text className="text-white font-semibold text-sm">
                {t("profile.subscription_screen.unavailableBanner.retry")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View className="px-4">
          {PLANS.map((plan) => renderPlanCard(plan))}
        </View>

        <View className="px-6 mt-2 items-center">
          <TouchableOpacity
            onPress={handleRestore}
            disabled={restoring}
            activeOpacity={0.7}
            className="py-3"
          >
            {restoring ? (
              <ActivityIndicator color="#111827" />
            ) : (
              <Text className="text-base text-gray-900 font-semibold underline">
                {t("profile.subscription_screen.restore.button")}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="px-6 mt-2 flex-row items-center justify-center gap-4">
          <TouchableOpacity onPress={() => router.push("/profile/terms")}>
            <Text className="text-xs text-gray-500 underline">
              {t("profile.subscription_screen.links.terms")}
            </Text>
          </TouchableOpacity>
          <Text className="text-xs text-gray-300">|</Text>
          <TouchableOpacity onPress={() => router.push("/profile/privacy")}>
            <Text className="text-xs text-gray-500 underline">
              {t("profile.subscription_screen.links.privacy")}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="px-6 mt-4 items-center">
          <Text className="text-gray-400 text-xs text-center">
            {t("profile.subscription_screen.footer")}
          </Text>
        </View>
      </ScrollView>

      <AlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        onClose={hideAlert}
        type={alertState.type}
        buttons={alertState.buttons}
      />
    </SafeAreaView>
  );
}

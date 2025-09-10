from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any
from ..models.referrals import CommissionBreakdown

class CommissionCalculator:
    """
    מחשבון עמלות מתקדם - Advanced commission calculator
    Handles complex multi-level referral commission calculations
    """
    
    def __init__(self):
        # Platform base commission rates
        self.platform_base_rate = Decimal('0.05')  # 5% platform fee
        self.platform_premium_rate = Decimal('0.10')  # 10% for premium categories
        
        # Referrer tier multipliers
        self.tier_multipliers = {
            'bronze': Decimal('1.0'),
            'silver': Decimal('1.1'),
            'gold': Decimal('1.2'),
            'premium': Decimal('1.3')
        }
        
        # Category-specific rates
        self.category_rates = {
            'renovation': {
                'base_commission': Decimal('0.10'),
                'platform_rate': Decimal('0.10')
            },
            'plumbing': {
                'base_commission': Decimal('0.08'),
                'platform_rate': Decimal('0.08')
            },
            'electrical': {
                'base_commission': Decimal('0.08'),
                'platform_rate': Decimal('0.08')
            },
            'cleaning': {
                'base_commission': Decimal('0.06'),
                'platform_rate': Decimal('0.05')
            },
            'tutoring': {
                'base_commission': Decimal('0.12'),
                'platform_rate': Decimal('0.10')
            },
            'general': {
                'base_commission': Decimal('0.05'),
                'platform_rate': Decimal('0.05')
            }
        }
    
    async def calculate_commission_breakdown(
        self,
        lead_value: Decimal,
        commission_rate: Decimal,
        category: str = 'general',
        referrer_level: str = 'bronze',
        chain_length: int = 1
    ) -> List[CommissionBreakdown]:
        """
        חישוב פירוט עמלות - Calculate detailed commission breakdown
        """
        breakdown = []
        
        # Get category configuration
        category_config = self.category_rates.get(category, self.category_rates['general'])
        
        # Calculate base commission amount
        base_commission = lead_value * commission_rate
        
        # Apply tier multiplier for referrer
        tier_multiplier = self.tier_multipliers.get(referrer_level, Decimal('1.0'))
        referrer_base = base_commission * tier_multiplier
        
        # Calculate platform commission
        platform_rate = category_config['platform_rate']
        platform_commission = lead_value * platform_rate
        
        # Multi-level referral calculations
        if chain_length == 1:
            # Single level referral
            breakdown = await self._calculate_single_level(
                lead_value, referrer_base, platform_commission, 
                category, referrer_level
            )
        else:
            # Multi-level referral chain
            breakdown = await self._calculate_multi_level(
                lead_value, base_commission, platform_commission,
                category, chain_length
            )
        
        return breakdown
    
    async def _calculate_single_level(
        self,
        lead_value: Decimal,
        referrer_commission: Decimal,
        platform_commission: Decimal,
        category: str,
        referrer_level: str
    ) -> List[CommissionBreakdown]:
        """Calculate commission for single-level referral"""
        breakdown = []
        
        # Referrer commission
        referrer_percentage = (referrer_commission / lead_value * 100).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        breakdown.append(CommissionBreakdown(
            recipient_id="referrer",
            recipient_type="referrer",
            amount=referrer_commission.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            percentage=referrer_percentage,
            description=f"עמלת מפנה רמת {referrer_level} - {category}",
            level=0
        ))
        
        # Platform commission
        platform_percentage = (platform_commission / lead_value * 100).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        breakdown.append(CommissionBreakdown(
            recipient_id="platform",
            recipient_type="platform",
            amount=platform_commission.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            percentage=platform_percentage,
            description=f"עמלת פלטפורמה - {category}",
            level=0
        ))
        
        return breakdown
    
    async def _calculate_multi_level(
        self,
        lead_value: Decimal,
        base_commission: Decimal,
        platform_commission: Decimal,
        category: str,
        chain_length: int
    ) -> List[CommissionBreakdown]:
        """Calculate commission for multi-level referral chain"""
        breakdown = []
        
        # Multi-level commission distribution
        level_rates = {
            0: Decimal('0.60'),  # 60% to direct referrer
            1: Decimal('0.25'),  # 25% to 2nd level
            2: Decimal('0.10'),  # 10% to 3rd level
            3: Decimal('0.05')   # 5% to 4th+ levels
        }
        
        remaining_commission = base_commission
        
        for level in range(min(chain_length, 4)):  # Max 4 levels
            level_rate = level_rates.get(level, Decimal('0.05'))
            level_commission = base_commission * level_rate
            
            if level_commission > remaining_commission:
                level_commission = remaining_commission
            
            level_percentage = (level_commission / lead_value * 100).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
            
            breakdown.append(CommissionBreakdown(
                recipient_id=f"referrer_level_{level}",
                recipient_type="referrer",
                amount=level_commission.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
                percentage=level_percentage,
                description=f"עמלת מפנה רמה {level + 1} - {category}",
                level=level
            ))
            
            remaining_commission -= level_commission
            
            if remaining_commission <= Decimal('0.01'):
                break
        
        # Platform commission
        platform_percentage = (platform_commission / lead_value * 100).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        breakdown.append(CommissionBreakdown(
            recipient_id="platform",
            recipient_type="platform",
            amount=platform_commission.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            percentage=platform_percentage,
            description=f"עמלת פלטפורמה - רב-רמתי {category}",
            level=0
        ))
        
        return breakdown
    
    def calculate_referrer_bonus(
        self,
        total_referrals: int,
        success_rate: float,
        monthly_volume: Decimal
    ) -> Decimal:
        """
        חישוב בונוס מפנה - Calculate referrer performance bonus
        """
        bonus = Decimal('0')
        
        # Volume bonus
        if monthly_volume >= Decimal('50000'):  # 50k+ NIS
            bonus += monthly_volume * Decimal('0.01')  # 1% volume bonus
        elif monthly_volume >= Decimal('20000'):  # 20k+ NIS
            bonus += monthly_volume * Decimal('0.005')  # 0.5% volume bonus
        
        # Performance bonus
        if success_rate >= 0.9 and total_referrals >= 10:
            bonus += Decimal('500')  # Excellence bonus
        elif success_rate >= 0.8 and total_referrals >= 5:
            bonus += Decimal('200')  # Performance bonus
        
        # Consistency bonus
        if total_referrals >= 20:
            bonus += Decimal('100')  # Consistency bonus
        
        return bonus.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    def calculate_penalty_reduction(
        self,
        commission_amount: Decimal,
        dispute_count: int,
        late_payment_count: int,
        quality_score: float
    ) -> Decimal:
        """
        חישוב הפחתת עונשים - Calculate penalty reductions
        """
        reduction = Decimal('0')
        
        # Dispute penalty
        if dispute_count > 3:
            reduction += commission_amount * Decimal('0.10')  # 10% penalty
        elif dispute_count > 1:
            reduction += commission_amount * Decimal('0.05')  # 5% penalty
        
        # Late payment penalty
        if late_payment_count > 2:
            reduction += commission_amount * Decimal('0.02')  # 2% penalty
        
        # Quality score penalty
        if quality_score < 0.7:
            reduction += commission_amount * Decimal('0.05')  # 5% quality penalty
        
        # Cap reduction at 20% of commission
        max_reduction = commission_amount * Decimal('0.20')
        return min(reduction, max_reduction).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    def calculate_seasonal_adjustments(
        self,
        base_commission: Decimal,
        category: str,
        month: int
    ) -> Decimal:
        """
        התאמות עונתיות - Calculate seasonal commission adjustments
        """
        # Seasonal multipliers by category and month
        seasonal_multipliers = {
            'renovation': {
                3: Decimal('1.2'),   # Spring boost
                4: Decimal('1.3'),   # Peak season
                5: Decimal('1.2'),   # Spring boost
                9: Decimal('1.1'),   # Fall prep
                10: Decimal('1.1'),  # Fall prep
            },
            'cleaning': {
                3: Decimal('1.4'),   # Passover cleaning
                9: Decimal('1.3'),   # High holidays
                12: Decimal('1.2'),  # Year end
            },
            'tutoring': {
                8: Decimal('1.3'),   # Back to school
                9: Decimal('1.2'),   # School start
                1: Decimal('1.1'),   # Exam prep
                5: Decimal('1.1'),   # Final exams
            }
        }
        
        category_adjustments = seasonal_multipliers.get(category, {})
        multiplier = category_adjustments.get(month, Decimal('1.0'))
        
        adjusted_commission = base_commission * multiplier
        return adjusted_commission.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)